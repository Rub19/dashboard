use crate::{Block, Cell};
use slint::{Color, Image, Model, ModelRc, SharedString, VecModel};
use std::rc::Rc;

#[derive(Clone, Default, PartialEq)]
pub struct C {
    pub kind: &'static str,
    pub id: String,
    pub title: String,
    pub sub: String,
    pub value: String,
    pub extra: String,
    pub tip: String,
    pub icon: Image,
    pub image: Image,
    pub image2: Image,
    pub tone: &'static str,
    pub on: bool,
    pub busy: bool,
    pub disabled: bool,
    pub round: bool,
    pub progress: f32,
    pub weight: f32,
    pub size: f32,
    pub color: Option<Color>,
    pub color2: Option<Color>,
}

#[derive(Clone, Default, PartialEq)]
pub struct B {
    pub kind: &'static str,
    pub id: String,
    pub title: String,
    pub sub: String,
    pub value: String,
    pub extra: &'static str,
    pub tone: &'static str,
    pub icon: Image,
    pub image: Image,
    pub on: bool,
    pub busy: bool,
    pub disabled: bool,
    pub corners: i32,
    pub level: i32,
    pub height: f32,
    pub gap: f32,
    pub progress: f32,
    pub color: Option<Color>,
    pub path: String,
    pub cells: Vec<C>,
}

fn s(text: &str) -> SharedString {
    SharedString::from(text)
}

impl C {
    pub fn cell(&self) -> Cell {
        Cell {
            kind: s(self.kind),
            id: s(&self.id),
            title: s(&self.title),
            sub: s(&self.sub),
            value: s(&self.value),
            extra: s(&self.extra),
            tip: s(&self.tip),
            icon: self.icon.clone(),
            image: self.image.clone(),
            image2: self.image2.clone(),
            tone: s(self.tone),
            on: self.on,
            busy: self.busy,
            disabled: self.disabled,
            round: self.round,
            progress: self.progress,
            weight: self.weight,
            size: self.size,
            color: self.color.unwrap_or(Color::from_argb_u8(0, 0, 0, 0)),
            color2: self.color2.unwrap_or(Color::from_argb_u8(0, 0, 0, 0)),
        }
    }

    pub fn grow(mut self) -> Self {
        self.weight = 1.0;
        self
    }
    pub fn tone(mut self, tone: &'static str) -> Self {
        self.tone = tone;
        self
    }
    pub fn size(mut self, size: f32) -> Self {
        self.size = size;
        self
    }
    pub fn icon(mut self, icon: Image) -> Self {
        self.icon = icon;
        self
    }
    pub fn image(mut self, image: Image) -> Self {
        self.image = image;
        self
    }
    pub fn tip(mut self, tip: &str) -> Self {
        self.tip = tip.into();
        self
    }
    pub fn off(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }
    pub fn on(mut self, on: bool) -> Self {
        self.on = on;
        self
    }
    pub fn right(mut self) -> Self {
        self.extra = "right".into();
        self
    }
    pub fn center(mut self) -> Self {
        self.extra = "center".into();
        self
    }
    pub fn color(mut self, color: Color) -> Self {
        self.color = Some(color);
        self
    }
    pub fn round(mut self) -> Self {
        self.round = true;
        self
    }
    pub fn focus(mut self) -> Self {
        self.busy = true;
        self
    }
    pub fn id(mut self, id: &str) -> Self {
        self.id = id.into();
        self
    }
}

pub fn text(title: &str) -> C {
    C { kind: "text", title: title.into(), ..Default::default() }
}
pub fn strong(title: &str) -> C {
    text(title).on(true)
}
pub fn muted(title: &str) -> C {
    text(title).tone("muted")
}
pub fn wrap(title: &str) -> C {
    C { kind: "wrap", title: title.into(), weight: 1.0, ..Default::default() }
}
pub fn stack(title: &str, sub: &str) -> C {
    C { kind: "stack", title: title.into(), sub: sub.into(), weight: 1.0, ..Default::default() }
}
pub fn stack_wrap(title: &str, sub: &str) -> C {
    C { kind: "stackwrap", title: title.into(), sub: sub.into(), weight: 1.0, ..Default::default() }
}
pub fn btn(id: &str, title: &str) -> C {
    C { kind: "btn", id: id.into(), title: title.into(), ..Default::default() }
}
pub fn primary(id: &str, title: &str) -> C {
    btn(id, title).tone("primary")
}
pub fn danger(id: &str, title: &str) -> C {
    btn(id, title).tone("danger")
}
pub fn ibtn(id: &str, icon: Image, tip: &str) -> C {
    C { kind: "ibtn", id: id.into(), icon, tip: tip.into(), ..Default::default() }
}
pub fn link(id: &str, title: &str) -> C {
    C { kind: "link", id: id.into(), title: title.into(), ..Default::default() }
}
pub fn switch(id: &str, on: bool, label: &str) -> C {
    C { kind: "switch", id: id.into(), on, title: label.into(), ..Default::default() }
}
pub fn input(id: &str, value: &str, placeholder: &str) -> C {
    C { kind: "input", id: id.into(), value: value.into(), title: placeholder.into(), tip: placeholder.into(), weight: 1.0, ..Default::default() }
}
pub fn secret(id: &str, value: &str, placeholder: &str) -> C {
    C { on: true, ..input(id, value, placeholder) }
}
pub fn area(id: &str, value: &str, placeholder: &str, tall: f32) -> C {
    C { kind: "area", id: id.into(), value: value.into(), title: placeholder.into(), tip: placeholder.into(), size: tall, weight: 1.0, ..Default::default() }
}
pub fn select(id: &str, current: &str, icon: Image) -> C {
    C { kind: "select", id: id.into(), title: current.into(), icon, ..Default::default() }
}
pub fn stat(title: &str, value: &str, sub: &str) -> C {
    C { kind: "stat", title: title.into(), value: value.into(), sub: sub.into(), weight: 1.0, ..Default::default() }
}
pub fn tile(id: &str, title: &str, value: &str, sub: &str) -> C {
    C { kind: "tile", id: id.into(), title: title.into(), value: value.into(), sub: sub.into(), weight: 1.0, ..Default::default() }
}
pub fn img(image: Image, size: f32) -> C {
    C { kind: "img", image, size, ..Default::default() }
}
pub fn img_box(image: Image, width: f32, height: f32) -> C {
    C { kind: "img", image, size: width, progress: height, ..Default::default() }
}
pub fn avatar(initial: &str, image: Image, size: f32) -> C {
    C { kind: "avatar", title: initial.into(), image, size, ..Default::default() }
}
pub fn icon(image: Image) -> C {
    C { kind: "icon", icon: image, ..Default::default() }
}
pub fn chip(id: &str, title: &str) -> C {
    C { kind: "chip", id: id.into(), title: title.into(), ..Default::default() }
}
pub fn kbd(title: &str) -> C {
    C { kind: "kbd", title: title.into(), ..Default::default() }
}
pub fn bar(progress: f32) -> C {
    C { kind: "bar", progress, weight: 1.0, ..Default::default() }
}
pub fn seek(id: &str, progress: f32) -> C {
    C { kind: "seek", id: id.into(), progress, weight: 1.0, ..Default::default() }
}
pub fn gap() -> C {
    C { kind: "gap", weight: 1.0, ..Default::default() }
}
pub fn fixed_gap(size: f32) -> C {
    C { kind: "gap", size, ..Default::default() }
}

impl B {
    pub fn block(&self, model: Option<ModelRc<Cell>>) -> Block {
        Block {
            kind: s(self.kind),
            id: s(&self.id),
            title: s(&self.title),
            sub: s(&self.sub),
            value: s(&self.value),
            extra: s(self.extra),
            tone: s(self.tone),
            icon: self.icon.clone(),
            image: self.image.clone(),
            on: self.on,
            busy: self.busy,
            disabled: self.disabled,
            corners: self.corners,
            level: self.level,
            height: self.height,
            gap: self.gap,
            progress: self.progress,
            color: self.color.unwrap_or(Color::from_argb_u8(0, 0, 0, 0)),
            path: s(&self.path),
            cells: model.unwrap_or_else(|| ModelRc::new(VecModel::from(self.cells.iter().map(C::cell).collect::<Vec<_>>()))),
        }
    }

    pub fn id(mut self, id: &str) -> Self {
        self.id = id.into();
        self
    }
    pub fn menu(mut self, id: &str) -> Self {
        self.value = id.into();
        self
    }
    pub fn on(mut self, on: bool) -> Self {
        self.on = on;
        self
    }
    pub fn gap(mut self, gap: f32) -> Self {
        self.gap = gap;
        self
    }
    pub fn level(mut self, level: i32) -> Self {
        self.level = level;
        self
    }
    pub fn tall(mut self, height: f32) -> Self {
        self.height = height;
        self
    }
    pub fn end(mut self) -> Self {
        self.extra = "end";
        self
    }
    pub fn center(mut self) -> Self {
        self.extra = "center";
        self
    }
    pub fn tone(mut self, tone: &'static str) -> Self {
        self.tone = tone;
        self
    }
}

pub fn head(title: &str, sub: &str, cells: Vec<C>) -> B {
    B { kind: "head", title: title.into(), sub: sub.into(), cells, ..Default::default() }
}
pub fn h2(title: &str) -> B {
    B { kind: "h2", title: title.into(), ..Default::default() }
}
pub fn h2x(title: &str, sub: &str, cells: Vec<C>) -> B {
    B { kind: "h2", title: title.into(), sub: sub.into(), cells, ..Default::default() }
}
pub fn prose(title: &str) -> B {
    B { kind: "prose", title: title.into(), ..Default::default() }
}
pub fn note(title: &str) -> B {
    B { kind: "prose", tone: "muted", title: title.into(), ..Default::default() }
}
pub fn bad(title: &str) -> B {
    B { kind: "prose", tone: "bad", title: title.into(), ..Default::default() }
}
pub fn read(title: &str) -> B {
    B { kind: "read", title: title.into(), ..Default::default() }
}
pub fn error(title: &str, cells: Vec<C>) -> B {
    B { kind: "error", title: title.into(), cells, ..Default::default() }
}
pub fn empty(title: &str, sub: &str) -> B {
    B { kind: "empty", title: title.into(), sub: sub.into(), ..Default::default() }
}
pub fn empty_with(title: &str, sub: &str, cells: Vec<C>) -> B {
    B { kind: "empty", title: title.into(), sub: sub.into(), cells, ..Default::default() }
}
pub fn skeletons(count: usize, height: f32) -> Vec<B> {
    (0..count).map(|_| B { kind: "skeleton", height, ..Default::default() }).collect()
}
pub fn space(height: f32) -> B {
    B { kind: "space", height, ..Default::default() }
}
pub fn divider() -> B {
    B { kind: "divider", ..Default::default() }
}
pub fn row(cells: Vec<C>) -> B {
    B { kind: "row", cells, ..Default::default() }
}
pub fn card(cells: Vec<C>) -> B {
    B { kind: "row", tone: "card", cells, ..Default::default() }
}
pub fn field(title: &str, cells: Vec<C>) -> B {
    B { kind: "field", title: title.into(), cells, ..Default::default() }
}
pub fn tabs(items: &[(&str, &str)], active: &str, prefix: &str) -> B {
    let longest = items.iter().map(|(_, label)| *label).max_by_key(|label| label.chars().count()).unwrap_or_default();
    let cells = items.iter().map(|(id, label)| C { kind: "tab", id: format!("{prefix}{id}"), title: (*label).into(), on: *id == active, ..Default::default() }).collect();
    B { kind: "tabs", title: longest.into(), corners: items.iter().position(|(id, _)| *id == active).map_or(-1, |at| at as i32), cells, ..Default::default() }
}
pub fn seg(items: &[(&str, &str)], active: &str, prefix: &str) -> B {
    B { kind: "seg", ..tabs(items, active, prefix) }
}
pub fn grid(cells: Vec<C>, columns: usize, gap: f32) -> Vec<B> {
    cells.chunks(columns.max(1)).map(|chunk| {
        let mut line = chunk.to_vec();
        line.resize_with(columns.max(1), || C { kind: "spacer", weight: 1.0, ..Default::default() });
        row(line).gap(gap)
    }).collect()
}

pub fn group(rows: Vec<B>) -> Vec<B> {
    let last = rows.len().saturating_sub(1);
    rows.into_iter().enumerate().map(|(at, mut row)| {
        row.tone = "card";
        row.corners = if last == 0 { 0 } else if at == 0 { 1 } else if at == last { 3 } else { 2 };
        row.gap = row.gap.max(10.0);
        row
    }).collect()
}
pub fn banner(image: Image, height: f32, cells: Vec<C>) -> B {
    B { kind: "banner", image, height, cells, ..Default::default() }
}
pub fn bars(height: f32, cells: Vec<C>) -> B {
    B { kind: "bars", height, cells, ..Default::default() }
}
pub fn spark(values: &[f64], height: f32) -> B {
    let (low, high) = values.iter().fold((f64::MAX, f64::MIN), |(low, high), value| (low.min(*value), high.max(*value)));
    let span = (high - low).max(1e-6);
    let step = 100.0 / (values.len().max(2) - 1) as f64;
    let path = values.iter().enumerate().map(|(at, value)| format!("{} {:.2} {:.2}", if at == 0 { "M" } else { "L" }, at as f64 * step, 100.0 - (value - low) / span * 100.0)).collect::<Vec<_>>().join(" ");
    B { kind: "spark", height, path, ..Default::default() }
}

pub struct Sync {
    pub model: Rc<VecModel<Block>>,
    last: Vec<B>,
}

impl Sync {
    pub fn new() -> Self {
        Self { model: Rc::new(VecModel::default()), last: Vec::new() }
    }

    pub fn apply(&mut self, next: Vec<B>) {
        for (at, block) in next.iter().enumerate() {
            match self.last.get(at) {
                Some(old) if old == block => {}
                Some(old) => {
                    let kept = self.model.row_data(at).map(|row| row.cells).filter(|cells| old.cells.len() == block.cells.len() && cells.row_count() == block.cells.len() && old.kind == block.kind);
                    if let Some(cells) = &kept {
                        for (index, cell) in block.cells.iter().enumerate() {
                            if old.cells[index] != *cell {
                                cells.set_row_data(index, cell.cell());
                            }
                        }
                    }
                    self.model.set_row_data(at, block.block(kept));
                }
                None => self.model.push(block.block(None)),
            }
        }
        while self.model.row_count() > next.len() {
            self.model.remove(self.model.row_count() - 1);
        }
        self.last = next;
    }

    pub fn rc(&self) -> ModelRc<Block> {
        ModelRc::from(self.model.clone())
    }
}

pub fn hex(text: &str) -> Color {
    let clean = text.trim_start_matches('#');
    let value = |at: usize| u8::from_str_radix(clean.get(at..at + 2).unwrap_or("00"), 16).unwrap_or(0);
    if clean.len() == 3 {
        let short = |at: usize| u8::from_str_radix(&clean[at..at + 1].repeat(2), 16).unwrap_or(0);
        return Color::from_rgb_u8(short(0), short(1), short(2));
    }
    if clean.len() >= 8 {
        return Color::from_argb_u8(value(6), value(0), value(2), value(4));
    }
    Color::from_rgb_u8(value(0), value(2), value(4))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_reads_short_long_and_alpha() {
        assert_eq!(hex("#fff"), Color::from_rgb_u8(255, 255, 255));
        assert_eq!(hex("#0a84ff"), Color::from_rgb_u8(10, 132, 255));
        assert_eq!(hex("#00000080").alpha(), 128);
    }

    #[test]
    fn group_gives_each_row_its_corner() {
        let rows = group(vec![row(vec![]), row(vec![]), row(vec![])]);
        assert_eq!(rows.iter().map(|row| row.corners).collect::<Vec<_>>(), vec![1, 2, 3]);
        assert_eq!(group(vec![row(vec![])])[0].corners, 0);
    }
}
