// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod library;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(library::DB_URL, library::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
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
