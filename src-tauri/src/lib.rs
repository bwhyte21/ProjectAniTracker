// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod library;

use serde::Serialize;
use tauri_plugin_log::{Target, TargetKind};

#[derive(Serialize)]
struct BuildInfo {
    version: String,
    git_commit: String,
    platform: String,
}

#[tauri::command]
fn get_build_info(app: tauri::AppHandle) -> BuildInfo {
    BuildInfo {
        version: app.package_info().version.to_string(),
        git_commit: env!("GIT_COMMIT").to_string(),
        platform: format!("{}/{}", std::env::consts::OS, std::env::consts::ARCH),
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ADR-0010: one shared log file for TS and Rust errors, in the OS log
// directory (app_log_dir). The file name is given without extension; the
// plugin appends `.log`. Level Info keeps dependency debug noise from
// rotating real errors out.
fn log_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .targets([Target::new(TargetKind::LogDir {
            file_name: Some("anitracker".into()),
        })])
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(log_plugin())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(library::DB_URL, library::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            get_build_info,
            library::save_anime,
            library::update_watch_status,
            library::update_episodes_seen,
            library::delete_anime,
            library::get_library,
            library::get_library_by_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::Manager;

    // Proves the Phase 20 link the E2E suite cannot (it runs against mocked
    // IPC): a log record from the plugin's configured LogDir target lands
    // in anitracker.log under the app_log_dir. XDG_DATA_HOME is pointed at
    // a temp dir so the test never writes to the real user log directory.
    #[test]
    fn log_plugin_writes_error_records_to_the_app_log_dir() {
        let data_home =
            std::env::temp_dir().join(format!("anitracker-log-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&data_home);
        std::fs::create_dir_all(&data_home).unwrap();
        std::env::set_var("XDG_DATA_HOME", &data_home);

        let app = tauri::test::mock_builder()
            .plugin(log_plugin())
            .build(tauri::generate_context!())
            .unwrap();

        log::error!("log plugin test error line");

        let log_path = app.path().app_log_dir().unwrap().join("anitracker.log");
        let contents = std::fs::read_to_string(&log_path);

        std::env::remove_var("XDG_DATA_HOME");
        let _ = std::fs::remove_dir_all(&data_home);

        let contents = contents.unwrap();
        assert!(contents.contains("[ERROR]"));
        assert!(contents.contains("log plugin test error line"));
    }
}
