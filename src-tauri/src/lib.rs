use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "chiffrage_sections",
            sql: include_str!("../migrations/002_chiffrage.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "prestation",
            sql: include_str!("../migrations/003_prestation.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "prestation_v2",
            sql: include_str!("../migrations/004_prestation_v2.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "drop_unite",
            sql: include_str!("../migrations/005_drop_unite.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_cp",
            sql: include_str!("../migrations/006_add_cp.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "powerpoint",
            sql: include_str!("../migrations/007_powerpoint.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "cr_pieces_jointes",
            sql: include_str!("../migrations/008_cr_pj.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:propulse.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
