use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=payload/ethone-setup.exe");
    let target = Path::new(&std::env::var("OUT_DIR").unwrap()).join("payload.exe");
    let source = Path::new("payload/ethone-setup.exe");
    if source.exists() {
        std::fs::copy(source, target).unwrap();
    } else {
        std::fs::write(target, []).unwrap();
    }
    tauri_build::build()
}
