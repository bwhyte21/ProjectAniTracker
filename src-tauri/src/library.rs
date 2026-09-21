use serde::Serialize;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{DbInstances, DbPool, Migration, MigrationKind};

/// Connection string understood by tauri-plugin-sql. The plugin resolves
/// `sqlite:` databases relative to the OS app-config directory.
pub const DB_URL: &str = "sqlite:anitracker.db";

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create tracked_anime table",
        sql: "CREATE TABLE tracked_anime (
            anilist_id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            cover_image_path TEXT NOT NULL,
            episode_count INTEGER,
            season TEXT,
            year INTEGER,
            format TEXT,
            status TEXT NOT NULL,
            episodes_seen INTEGER NOT NULL DEFAULT 0,
            saved_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        kind: MigrationKind::Up,
    }]
}

#[derive(Debug, Serialize)]
pub struct TrackedAnime {
    pub anilist_id: i64,
    pub title: String,
    pub cover_image_path: String,
    pub episode_count: Option<i64>,
    pub season: Option<String>,
    pub year: Option<i64>,
    pub format: Option<String>,
    pub status: String,
    pub episodes_seen: i64,
    pub saved_at: String,
}

fn row_to_tracked_anime(row: &sqlx::sqlite::SqliteRow) -> TrackedAnime {
    TrackedAnime {
        anilist_id: row.get("anilist_id"),
        title: row.get("title"),
        cover_image_path: row.get("cover_image_path"),
        episode_count: row.get("episode_count"),
        season: row.get("season"),
        year: row.get("year"),
        format: row.get("format"),
        status: row.get("status"),
        episodes_seen: row.get("episodes_seen"),
        saved_at: row.get("saved_at"),
    }
}

async fn db_pool(app: &AppHandle) -> Result<SqlitePool, String> {
    let instances = app.state::<DbInstances>();
    let instances = instances.inner().0.read().await;
    if let Some(DbPool::Sqlite(pool)) = instances.get(DB_URL) {
        Ok(pool.clone())
    } else {
        Err(format!("database {DB_URL} is not loaded"))
    }
}

async fn download_cover(app: &AppHandle, anilist_id: i64, url: &str) -> Result<String, String> {
    let covers_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app-data directory: {e}"))?
        .join("covers");
    std::fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("failed to create covers directory: {e}"))?;

    let url_path = url.split(['?', '#']).next().unwrap_or(url);
    let extension = std::path::Path::new(url_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let file_path = covers_dir.join(format!("{anilist_id}.{extension}"));

    let response = reqwest::get(url)
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("failed to download cover image: {e}"))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("failed to read cover image: {e}"))?;

    std::fs::write(&file_path, &bytes).map_err(|e| format!("failed to write cover image: {e}"))?;
    Ok(file_path.to_string_lossy().into_owned())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn save_anime(
    app: AppHandle,
    anilist_id: i64,
    title: String,
    cover_image_url: String,
    episode_count: Option<i64>,
    season: Option<String>,
    year: Option<i64>,
    format: Option<String>,
    status: String,
    episodes_seen: Option<i64>,
) -> Result<String, String> {
    let cover_image_path = download_cover(&app, anilist_id, &cover_image_url).await?;

    let pool = db_pool(&app).await?;
    sqlx::query(
        "INSERT INTO tracked_anime
            (anilist_id, title, cover_image_path, episode_count, season, year, format, status, episodes_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(anilist_id)
    .bind(&title)
    .bind(&cover_image_path)
    .bind(episode_count)
    .bind(season)
    .bind(year)
    .bind(format)
    .bind(&status)
    .bind(episodes_seen.unwrap_or(0))
    .execute(&pool)
    .await
    .map_err(|e| format!("failed to save anime: {e}"))?;

    Ok(cover_image_path)
}

#[tauri::command]
pub async fn update_watch_status(
    app: AppHandle,
    anilist_id: i64,
    status: String,
) -> Result<(), String> {
    let pool = db_pool(&app).await?;
    let result = sqlx::query("UPDATE tracked_anime SET status = ? WHERE anilist_id = ?")
        .bind(&status)
        .bind(anilist_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("failed to update watch status: {e}"))?;

    if result.rows_affected() == 0 {
        return Err(format!("no tracked anime with anilist_id {anilist_id}"));
    }
    Ok(())
}

#[tauri::command]
pub async fn update_episodes_seen(
    app: AppHandle,
    anilist_id: i64,
    episodes_seen: i64,
) -> Result<(), String> {
    let pool = db_pool(&app).await?;
    let result = sqlx::query("UPDATE tracked_anime SET episodes_seen = ? WHERE anilist_id = ?")
        .bind(episodes_seen)
        .bind(anilist_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("failed to update episodes seen: {e}"))?;

    if result.rows_affected() == 0 {
        return Err(format!("no tracked anime with anilist_id {anilist_id}"));
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_anime(app: AppHandle, anilist_id: i64) -> Result<(), String> {
    let pool = db_pool(&app).await?;

    let cover_image_path: Option<String> =
        sqlx::query("SELECT cover_image_path FROM tracked_anime WHERE anilist_id = ?")
            .bind(anilist_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| format!("failed to look up anime: {e}"))?
            .map(|row| row.get("cover_image_path"));

    let result = sqlx::query("DELETE FROM tracked_anime WHERE anilist_id = ?")
        .bind(anilist_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("failed to delete anime: {e}"))?;

    if result.rows_affected() == 0 {
        return Err(format!("no tracked anime with anilist_id {anilist_id}"));
    }
    if let Some(path) = cover_image_path {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_library(app: AppHandle) -> Result<Vec<TrackedAnime>, String> {
    let pool = db_pool(&app).await?;
    let rows = sqlx::query("SELECT * FROM tracked_anime ORDER BY saved_at DESC, anilist_id DESC")
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("failed to load library: {e}"))?;

    Ok(rows.iter().map(row_to_tracked_anime).collect())
}

#[tauri::command]
pub async fn get_library_by_status(
    app: AppHandle,
    status: String,
) -> Result<Vec<TrackedAnime>, String> {
    let pool = db_pool(&app).await?;
    let rows = sqlx::query(
        "SELECT * FROM tracked_anime WHERE status = ? ORDER BY saved_at DESC, anilist_id DESC",
    )
    .bind(&status)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("failed to load library: {e}"))?;

    Ok(rows.iter().map(row_to_tracked_anime).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn migration_creates_tracked_anime_table() {
        let pool = sqlx::SqlitePool::connect("sqlite::memory:").await.unwrap();

        for migration in migrations() {
            sqlx::query(migration.sql).execute(&pool).await.unwrap();
        }

        let columns: Vec<String> = sqlx::query("PRAGMA table_info(tracked_anime)")
            .fetch_all(&pool)
            .await
            .unwrap()
            .iter()
            .map(|row| row.get::<String, _>("name"))
            .collect();
        assert_eq!(
            columns,
            vec![
                "anilist_id",
                "title",
                "cover_image_path",
                "episode_count",
                "season",
                "year",
                "format",
                "status",
                "episodes_seen",
                "saved_at",
            ]
        );

        sqlx::query(
            "INSERT INTO tracked_anime
                (anilist_id, title, cover_image_path, episode_count, season, year, format, status, episodes_seen)
             VALUES (1, 'Cowboy Bebop', '/covers/1.jpg', 26, 'FALL', 1998, 'TV', 'watching', 5)",
        )
        .execute(&pool)
        .await
        .unwrap();

        let row = sqlx::query("SELECT * FROM tracked_anime WHERE anilist_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        let anime = row_to_tracked_anime(&row);
        assert_eq!(anime.title, "Cowboy Bebop");
        assert_eq!(anime.cover_image_path, "/covers/1.jpg");
        assert_eq!(anime.episode_count, Some(26));
        assert_eq!(anime.season, Some("FALL".to_string()));
        assert_eq!(anime.year, Some(1998));
        assert_eq!(anime.format, Some("TV".to_string()));
        assert_eq!(anime.status, "watching");
        assert_eq!(anime.episodes_seen, 5);
        assert!(!anime.saved_at.is_empty());
    }
}
