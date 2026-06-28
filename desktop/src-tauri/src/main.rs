// AiGovOps desktop (Tauri v2). Starts the zero-dependency gate server as a Node sidecar, then
// opens the Wizard. A double-clickable, offline-capable governance app — no terminal required.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Launch the gate (node packages/server/src/cli.mjs) bundled alongside the app.
            let (mut rx, _child) = app
                .shell()
                .command("node")
                .args(["resources/packages/server/src/cli.mjs"])
                .spawn()
                .expect("failed to start the AiGovOps gate");
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Stdout(line) = event {
                        println!("[gate] {}", String::from_utf8_lossy(&line));
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AiGovOps");
}
