use std::io::Write;
use std::path::PathBuf;

fn app_version(root: &std::path::Path) -> String {
    let manifest = std::fs::read_to_string(root.join("../app/Cargo.toml")).expect("app/Cargo.toml");
    manifest.lines().find_map(|line| line.strip_prefix("version = \"").and_then(|rest| rest.strip_suffix('"'))).expect("version").to_string()
}

fn main() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let out = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR"));
    slint_build::compile("ui/setup.slint").expect("slint");
    let payload = std::env::var("ETHONE_PAYLOAD").map(PathBuf::from).unwrap_or_else(|_| root.join("../target/release/ethone-native.exe"));
    println!("cargo:rerun-if-env-changed=ETHONE_PAYLOAD");
    println!("cargo:rerun-if-changed={}", payload.display());
    println!("cargo:rerun-if-changed=../app/Cargo.toml");
    println!("cargo:rerun-if-changed=../app/assets/ethone.ico");
    println!("cargo:rerun-if-changed=../app/assets/ethone-logo.png");
    let bytes = std::fs::read(&payload).unwrap_or_default();
    let mut encoder = flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::best());
    encoder.write_all(&bytes).expect("compression");
    std::fs::write(out.join("payload.bin"), encoder.finish().expect("compression")).expect("payload");
    let version = app_version(&root);
    println!("cargo:rustc-env=ETHONE_VERSION={version}");
    println!("cargo:rustc-env=ETHONE_PAYLOAD_SIZE={}", bytes.len());
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let parts: Vec<&str> = version.split('.').collect();
    let icon = root.join("../app/assets/ethone.ico").display().to_string().replace('\\', "/");
    let rc = format!(
        "#include <winver.h>\n1 ICON \"{icon}\"\nVS_VERSION_INFO VERSIONINFO\nFILEVERSION {a}, {b}, {c}, 0\nPRODUCTVERSION {a}, {b}, {c}, 0\nFILEOS VOS_NT_WINDOWS32\nFILETYPE VFT_APP\nBEGIN\n BLOCK \"StringFileInfo\"\n BEGIN\n  BLOCK \"040C04B0\"\n  BEGIN\n   VALUE \"CompanyName\", \"Rub19\"\n   VALUE \"FileDescription\", \"Installation d'Ethone\"\n   VALUE \"FileVersion\", \"{version}\"\n   VALUE \"OriginalFilename\", \"ethone-setup.exe\"\n   VALUE \"ProductName\", \"Ethone\"\n   VALUE \"ProductVersion\", \"{version}\"\n  END\n END\n BLOCK \"VarFileInfo\"\n BEGIN\n  VALUE \"Translation\", 0x040C, 1200\n END\nEND\n",
        a = parts.first().unwrap_or(&"0"),
        b = parts.get(1).unwrap_or(&"0"),
        c = parts.get(2).unwrap_or(&"0"),
    );
    let file = out.join("setup.rc");
    std::fs::write(&file, rc).expect("rc");
    embed_resource::compile(&file, embed_resource::NONE).manifest_optional().expect("ressources Windows");
}
