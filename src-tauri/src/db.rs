use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::borrow::Cow;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

use crate::library::{logged_error, migrations};

/// Database file name inside whatever directory is in use.
pub const DB_FILE_NAME: &str = "anitracker.db";
/// Single rotation slot for a target directory that already held a
/// database (ADR-0012): the previous file is never deleted, it becomes
/// the backup.
const BAK_FILE_NAME: &str = "anitracker.db.bak";
/// Pointer file in the app-config dir; absent or corrupt means the
/// default location (ADR-0012).
const POINTER_FILE_NAME: &str = "db-location.json";

#[derive(Serialize, Deserialize)]
struct DbLocationPointer {
    path: String,
}

/// The app-owned database state, managed as Tauri state (ADR-0012).
pub struct DbState {
    pool: SqlitePool,
    /// Directory the pool currently has open.
    location: PathBuf,
    is_default: bool,
    /// Boot opened the chosen directory's database but had to fall back
    /// to the default for this session; the pointer is left in place.
    fell_back: bool,
}

impl DbState {
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    fn db_file(&self) -> PathBuf {
        self.location.join(DB_FILE_NAME)
    }
}

fn pointer_file(config_dir: &Path) -> PathBuf {
    config_dir.join(POINTER_FILE_NAME)
}

/// Reads the location pointer. `None` means the default location:
/// absent file, unreadable file, or corrupt JSON all resolve to the
/// default rather than failing the boot.
fn read_pointer(config_dir: &Path) -> Option<PathBuf> {
    let contents = std::fs::read_to_string(pointer_file(config_dir)).ok()?;
    let pointer: DbLocationPointer = serde_json::from_str(&contents).ok()?;
    Some(PathBuf::from(pointer.path))
}

fn write_pointer(config_dir: &Path, dir: &Path) -> Result<(), String> {
    let pointer = DbLocationPointer {
        path: dir.to_string_lossy().into_owned(),
    };
    let contents = serde_json::to_string(&pointer)
        .map_err(|e| logged_error("failed to serialize the database location pointer", e))?;
    std::fs::write(pointer_file(config_dir), contents)
        .map_err(|e| logged_error("failed to write the database location pointer", e))
}

fn remove_pointer(config_dir: &Path) -> Result<(), String> {
    match std::fs::remove_file(pointer_file(config_dir)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(logged_error(
            "failed to remove the database location pointer",
            e,
        )),
    }
}

/// True when both paths resolve to the same directory, so a pick is a
/// no-op. Canonicalized when possible so `/home/user/db` and a
/// symlinked or trailing-slash variant of it match.
fn same_location(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => a == b,
    }
}

/// The sqlx migrator carrying the plugin-era schema definitions verbatim
/// (ADR-0012); it runs at every boot, so a fresh custom directory gets
/// the full schema.
fn migrator() -> sqlx::migrate::Migrator {
    sqlx::migrate::Migrator {
        migrations: Cow::Owned(migrations()),
        ignore_missing: false,
        locking: true,
        no_tx: false,
    }
}

/// Connects the pool in `dir` and runs the migrations. Every failure is
/// contextual so the boot fallback and the IPC error paths can log it.
async fn open_db(dir: &Path) -> Result<SqlitePool, String> {
    std::fs::create_dir_all(dir)
        .map_err(|e| logged_error("failed to create the database directory", e))?;
    let options = SqliteConnectOptions::new()
        .filename(dir.join(DB_FILE_NAME))
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .connect_with(options)
        .await
        .map_err(|e| logged_error("failed to connect to the database", e))?;
    migrator()
        .run(&pool)
        .await
        .map_err(|e| logged_error("failed to run database migrations", e))?;
    Ok(pool)
}

/// Boot-time initialization. A chosen directory that fails to open logs
/// the failure, falls back to the default for the session, and leaves
/// the pointer in place so the chosen path reconnects once it is
/// available again (ADR-0012).
pub async fn init_db(config_dir: &Path) -> DbState {
    match read_pointer(config_dir) {
        Some(chosen) => match open_db(&chosen).await {
            Ok(pool) => DbState {
                pool,
                location: chosen,
                is_default: false,
                fell_back: false,
            },
            Err(e) => {
                log::error!("{e}");
                let pool = open_db(config_dir)
                    .await
                    .expect("failed to open the default database");
                DbState {
                    pool,
                    location: config_dir.to_path_buf(),
                    is_default: true,
                    fell_back: true,
                }
            }
        },
        None => {
            let pool = open_db(config_dir)
                .await
                .expect("failed to open the default database");
            DbState {
                pool,
                location: config_dir.to_path_buf(),
                is_default: true,
                fell_back: false,
            }
        }
    }
}

/// Proves the target directory is writable before anything is rotated
/// or copied (ADR-0012).
fn probe_write(dir: &Path) -> Result<(), String> {
    let probe = dir.join(format!("{DB_FILE_NAME}.probe"));
    std::fs::write(&probe, b"probe")
        .map_err(|e| logged_error("failed to write to the chosen directory", e))?;
    std::fs::remove_file(&probe).map_err(|e| logged_error("failed to clean up the write probe", e))
}

/// Atomically moves the database to `target_dir`: probe, rotate any
/// existing target file to the single `.bak` slot, copy the current
/// file, then write (or, for the default, remove) the pointer. Any
/// failed step returns a contextual error having changed nothing the
/// app still depends on -- the live file is never touched.
async fn move_database(
    state: &DbState,
    config_dir: &Path,
    target_dir: &Path,
) -> Result<(), String> {
    std::fs::create_dir_all(target_dir)
        .map_err(|e| logged_error("failed to create the target directory", e))?;
    probe_write(target_dir)?;

    let target_db = target_dir.join(DB_FILE_NAME);
    if target_db.exists() {
        let backup = target_dir.join(BAK_FILE_NAME);
        if backup.exists() {
            std::fs::remove_file(&backup)
                .map_err(|e| logged_error("failed to rotate the previous backup", e))?;
        }
        std::fs::rename(&target_db, &backup)
            .map_err(|e| logged_error("failed to rotate the existing database", e))?;
    }

    std::fs::copy(state.db_file(), &target_db)
        .map_err(|e| logged_error("failed to copy the database", e))?;

    if same_location(target_dir, config_dir) {
        // Reset flow: the default needs no pointer.
        remove_pointer(config_dir)
    } else {
        write_pointer(config_dir, target_dir)
    }
}

#[derive(Debug, Serialize)]
pub struct DbLocation {
    pub path: String,
    pub is_default: bool,
    pub fell_back: bool,
}

#[tauri::command]
pub async fn get_db_location(app: AppHandle) -> Result<DbLocation, String> {
    let state = app.state::<DbState>();
    Ok(DbLocation {
        path: state.location.to_string_lossy().into_owned(),
        is_default: state.is_default,
        fell_back: state.fell_back,
    })
}

/// Moves the database to `dir`, or back to the app-config default when
/// `dir` is `None` (the reset flow). A same-directory pick is a no-op
/// that resolves successfully so the frontend can show its "already
/// using this location" toast; a successful move restarts the app
/// before the promise resolves.
#[tauri::command]
pub async fn set_db_location(app: AppHandle, dir: Option<String>) -> Result<(), String> {
    let state = app.state::<DbState>();
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| logged_error("failed to resolve the app-config directory", e))?;
    let target_dir = match dir {
        Some(dir) => {
            // The folder picker returns absolute paths; anything else
            // would silently resolve against the working directory.
            let path = PathBuf::from(&dir);
            if dir.is_empty() || !path.is_absolute() {
                return Err(logged_error(
                    "invalid database location",
                    "expected an absolute directory path",
                ));
            }
            path
        }
        None => config_dir.clone(),
    };

    if same_location(&state.location, &target_dir) {
        return Ok(());
    }
    move_database(&state, &config_dir, &target_dir).await?;
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("anitracker-db-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_config_with_pointer(config_dir: &Path, chosen: &Path) {
        write_pointer(config_dir, chosen).unwrap();
    }

    #[tokio::test]
    async fn pointer_round_trips_through_the_config_dir() {
        let config_dir = temp_dir("pointer-round-trip");
        let chosen = config_dir.join("chosen");

        assert_eq!(read_pointer(&config_dir), None);

        write_config_with_pointer(&config_dir, &chosen);
        assert_eq!(read_pointer(&config_dir), Some(chosen));

        remove_pointer(&config_dir).unwrap();
        assert_eq!(read_pointer(&config_dir), None);

        // Removing an absent pointer is not an error.
        remove_pointer(&config_dir).unwrap();

        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn corrupt_pointer_resolves_to_the_default() {
        let config_dir = temp_dir("corrupt-pointer");
        std::fs::write(pointer_file(&config_dir), "{not json").unwrap();

        assert_eq!(read_pointer(&config_dir), None);

        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn migrator_builds_the_schema_and_is_idempotent() {
        let dir = temp_dir("migrator");
        let pool = open_db(&dir).await.unwrap();

        let versions: Vec<i64> =
            sqlx::query("SELECT version FROM _sqlx_migrations ORDER BY version")
                .fetch_all(&pool)
                .await
                .unwrap()
                .iter()
                .map(|row| row.get::<i64, _>("version"))
                .collect();
        assert_eq!(versions, vec![1, 2]);

        let columns: Vec<String> = sqlx::query("PRAGMA table_info(tracked_anime)")
            .fetch_all(&pool)
            .await
            .unwrap()
            .iter()
            .map(|row| row.get::<String, _>("name"))
            .collect();
        assert!(columns.contains(&"updated_at".to_string()));

        // Every boot re-runs the migrator; applied migrations must not
        // re-apply or fail.
        migrator().run(&pool).await.unwrap();
        let count: i64 = sqlx::query("SELECT COUNT(*) AS count FROM _sqlx_migrations")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count");
        assert_eq!(count, 2);

        pool.close().await;
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn init_db_opens_the_chosen_directory() {
        let config_dir = temp_dir("init-chosen");
        let chosen = config_dir.join("chosen");
        std::fs::create_dir_all(&chosen).unwrap();
        write_config_with_pointer(&config_dir, &chosen);

        let state = init_db(&config_dir).await;
        assert_eq!(state.location, chosen);
        assert!(!state.is_default);
        assert!(!state.fell_back);
        assert!(state.db_file().exists());

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn init_db_without_pointer_opens_the_default() {
        let config_dir = temp_dir("init-default");

        let state = init_db(&config_dir).await;
        assert_eq!(state.location, config_dir);
        assert!(state.is_default);
        assert!(!state.fell_back);

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn boot_failure_on_the_chosen_directory_falls_back_and_keeps_the_pointer() {
        let config_dir = temp_dir("boot-fallback");
        // The chosen "directory" is unreachable: its parent is a regular
        // file, so creating the directory fails.
        let blocker = config_dir.join("blocker");
        std::fs::write(&blocker, b"file").unwrap();
        let chosen = blocker.join("chosen");
        write_config_with_pointer(&config_dir, &chosen);

        let state = init_db(&config_dir).await;
        assert_eq!(state.location, config_dir);
        assert!(state.is_default);
        assert!(state.fell_back);
        // The pointer survives so the chosen path reconnects later.
        assert_eq!(read_pointer(&config_dir), Some(chosen));
        assert!(state.db_file().exists());

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }

    async fn state_with_row(config_dir: &Path) -> DbState {
        let state = init_db(config_dir).await;
        sqlx::query(
            "INSERT INTO tracked_anime
                (anilist_id, title, cover_image_path, status, episodes_seen, saved_at, updated_at)
             VALUES (1, 'Cowboy Bebop', '/covers/1.jpg', 'watching', 5, datetime('now'), datetime('now'))",
        )
        .execute(state.pool())
        .await
        .unwrap();
        state
    }

    async fn target_row_count(dir: &Path) -> i64 {
        let pool = open_db(dir).await.unwrap();
        let count = sqlx::query("SELECT COUNT(*) AS count FROM tracked_anime")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count");
        pool.close().await;
        count
    }

    #[tokio::test]
    async fn move_database_copies_the_data_and_rotates_an_existing_target() {
        let config_dir = temp_dir("move");
        let state = state_with_row(&config_dir).await;
        let target = config_dir.join("target");
        std::fs::create_dir_all(&target).unwrap();
        std::fs::write(target.join(DB_FILE_NAME), b"previous database").unwrap();

        move_database(&state, &config_dir, &target).await.unwrap();

        // The target holds a copy with every tracked anime present.
        assert_eq!(target_row_count(&target).await, 1);
        // The previous target file rotated to the single backup slot.
        assert_eq!(
            std::fs::read(target.join("anitracker.db.bak")).unwrap(),
            b"previous database"
        );
        // The pointer was written and the source file is untouched.
        assert_eq!(read_pointer(&config_dir), Some(target.clone()));
        assert!(state.db_file().exists());

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn move_database_to_the_default_removes_the_pointer() {
        let config_dir = temp_dir("move-reset");
        let state = state_with_row(&config_dir).await;
        let target = config_dir.join("elsewhere");
        std::fs::create_dir_all(&target).unwrap();

        // A previous session moved out to the chosen directory.
        move_database(&state, &config_dir, &target).await.unwrap();
        let state = DbState {
            pool: state.pool().clone(),
            location: target.clone(),
            is_default: false,
            fell_back: false,
        };

        // The reset flow moves back to the default and drops the pointer.
        move_database(&state, &config_dir, &config_dir)
            .await
            .unwrap();

        assert_eq!(read_pointer(&config_dir), None);
        assert_eq!(target_row_count(&config_dir).await, 1);

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }

    #[tokio::test]
    async fn probe_failure_leaves_everything_untouched() {
        let config_dir = temp_dir("probe-failure");
        let state = state_with_row(&config_dir).await;
        let target = config_dir.join("target");
        std::fs::create_dir_all(&target).unwrap();
        std::fs::write(target.join(DB_FILE_NAME), b"previous database").unwrap();

        // A read-only target directory fails the pre-flight probe.
        let original = std::fs::metadata(&target).unwrap().permissions();
        let mut readonly = original.clone();
        readonly.set_readonly(true);
        std::fs::set_permissions(&target, readonly).unwrap();

        let result = move_database(&state, &config_dir, &target).await;

        std::fs::set_permissions(&target, original).unwrap();

        assert!(result.is_err());
        // No rotation, no copy, no pointer; the app keeps running on
        // the old file.
        assert_eq!(
            std::fs::read(target.join(DB_FILE_NAME)).unwrap(),
            b"previous database"
        );
        assert!(!target.join("anitracker.db.bak").exists());
        assert_eq!(read_pointer(&config_dir), None);
        assert!(state.db_file().exists());

        state.pool().close().await;
        let _ = std::fs::remove_dir_all(&config_dir);
    }
}
