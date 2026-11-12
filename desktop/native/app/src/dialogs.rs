use std::path::PathBuf;
use windows_sys::Win32::UI::Controls::Dialogs::{GetOpenFileNameW, OFN_ALLOWMULTISELECT, OFN_EXPLORER, OFN_FILEMUSTEXIST, OFN_NOCHANGEDIR, OFN_PATHMUSTEXIST, OPENFILENAMEW};

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn split_selection(buffer: &[u16]) -> Vec<PathBuf> {
    let parts: Vec<String> = buffer.split(|unit| *unit == 0).take_while(|part| !part.is_empty()).map(String::from_utf16_lossy).collect();
    match parts.as_slice() {
        [] => Vec::new(),
        [single] => vec![PathBuf::from(single)],
        [folder, files @ ..] => files.iter().map(|file| PathBuf::from(folder).join(file)).collect(),
    }
}

pub fn open_files(owner: Option<isize>, filter: &str, multiple: bool) -> Vec<PathBuf> {
    let mut buffer = vec![0u16; 65536];
    let filter: Vec<u16> = filter.replace('|', "\0").encode_utf16().chain([0, 0]).collect();
    let title = wide(&crate::i18n::tr("Choisir des fichiers", "Choose files"));
    let mut dialog: OPENFILENAMEW = unsafe { std::mem::zeroed() };
    dialog.lStructSize = std::mem::size_of::<OPENFILENAMEW>() as u32;
    dialog.hwndOwner = owner.unwrap_or(0) as _;
    dialog.lpstrFilter = filter.as_ptr();
    dialog.lpstrFile = buffer.as_mut_ptr();
    dialog.nMaxFile = buffer.len() as u32;
    dialog.lpstrTitle = title.as_ptr();
    dialog.Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR | if multiple { OFN_ALLOWMULTISELECT } else { 0 };
    if unsafe { GetOpenFileNameW(&mut dialog) } == 0 {
        return Vec::new();
    }
    split_selection(&buffer)
}

pub fn downloads() -> PathBuf {
    #[cfg(feature = "e2e")]
    if let Some(dir) = std::env::var_os("ETHONE_E2E_EXPORT") {
        return PathBuf::from(dir);
    }
    std::env::var("USERPROFILE").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir()).join("Downloads")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_and_multiple_selections_split() {
        let one: Vec<u16> = "C:\\a\\b.txt\0\0".encode_utf16().collect();
        assert_eq!(split_selection(&one), vec![PathBuf::from("C:\\a\\b.txt")]);
        let many: Vec<u16> = "C:\\a\0x.txt\0y.txt\0\0".encode_utf16().collect();
        assert_eq!(split_selection(&many), vec![PathBuf::from("C:\\a\\x.txt"), PathBuf::from("C:\\a\\y.txt")]);
        assert!(split_selection(&[0, 0]).is_empty());
    }
}
