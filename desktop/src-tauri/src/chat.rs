use base64::prelude::{Engine, BASE64_STANDARD, BASE64_URL_SAFE_NO_PAD};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_rustls::rustls::{self, pki_types::ServerName};
use tokio_rustls::{client::TlsStream, TlsConnector};

const HOSTS: [(&str, &str, &str); 15] = [
    ("eu1", "euw1.chat.si.riotgames.com", "eu1"),
    ("eu2", "eun1.chat.si.riotgames.com", "eu2"),
    ("eu3", "eu3.chat.si.riotgames.com", "eu3"),
    ("na1", "na2.chat.si.riotgames.com", "na1"),
    ("la1", "la1.chat.si.riotgames.com", "la1"),
    ("la2", "la2.chat.si.riotgames.com", "la2"),
    ("br1", "br.chat.si.riotgames.com", "br1"),
    ("tr1", "tr1.chat.si.riotgames.com", "tr1"),
    ("ru1", "ru1.chat.si.riotgames.com", "ru1"),
    ("jp1", "jp1.chat.si.riotgames.com", "jp1"),
    ("kr1", "kr1.chat.si.riotgames.com", "kr1"),
    ("oc1", "oc1.chat.si.riotgames.com", "oc1"),
    ("as2", "as2.chat.si.riotgames.com", "as2"),
    ("asia", "jp1.chat.si.riotgames.com", "jp1"),
    ("us2", "us2.chat.si.riotgames.com", "us2"),
];

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Friend {
    pub id: String,
    pub name: String,
    pub tag: String,
    pub online: bool,
    pub product: String,
    pub state: String,
    pub queue: String,
    pub tier: i64,
    pub party_size: i64,
    pub card: String,
    pub show: String,
    pub party_max: i64,
    pub party_id: String,
    pub party_state: String,
    pub ally_score: i64,
    pub enemy_score: i64,
    pub map: String,
    pub idle: bool,
    pub playing: bool,
    pub icon: String,
    pub title: String,
    pub last_online: String,
}

fn profile_icon(league: &str) -> Option<String> {
    let text = league.replace("&quot;", "\"").replace("\\\"", "\"");
    let start = text.find("\"profileIcon\"")?;
    let rest = &text[start + 13..];
    let digits: String = rest.chars().skip_while(|character| !character.is_ascii_digit()).take_while(char::is_ascii_digit).collect();
    (!digits.is_empty()).then(|| format!("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/{digits}.jpg"))
}

fn attribute(name: &str, text: &str) -> Option<String> {
    for quote in ['\'', '"'] {
        let needle = format!("{name}={quote}");
        let mut from = 0;
        while let Some(found) = text[from..].find(&needle) {
            let start = from + found;
            let boundary = start == 0 || !text[..start].ends_with(|character: char| character.is_alphanumeric() || character == '_');
            let value = start + needle.len();
            if boundary {
                return text[value..].find(quote).map(|end| text[value..value + end].to_string());
            }
            from = value;
        }
    }
    None
}

fn section<'a>(tag: &str, text: &'a str) -> Option<&'a str> {
    let open = format!("<{tag}");
    let mut from = 0;
    while let Some(found) = text[from..].find(&open) {
        let start = from + found;
        let after = text[start + open.len()..].chars().next()?;
        if after == '>' || after.is_whitespace() {
            let inner = start + text[start..].find('>')? + 1;
            let close = format!("</{tag}>");
            return text[inner..].find(&close).map(|end| &text[inner..inner + end]);
        }
        from = start + open.len();
    }
    None
}

fn unescape(value: &str) -> String {
    value.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'")
}

pub fn parse_roster(xml: &str) -> Vec<Friend> {
    let mut friends = Vec::new();
    for chunk in xml.split("<item ").skip(1) {
        let end = chunk.find('>').unwrap_or(chunk.len());
        let attributes = &chunk[..end];
        let body = chunk.split("</item>").next().unwrap_or(chunk);
        let id = attribute("puuid", attributes).or_else(|| attribute("jid", attributes).map(|jid| jid.split('@').next().unwrap_or_default().to_string())).unwrap_or_default();
        if id.is_empty() || attribute("subscription", attributes).is_some_and(|value| value != "both") {
            continue;
        }
        let id_tag = body.find("<id ").map(|start| &body[start..start + body[start..].find('>').unwrap_or(0)]).unwrap_or("");
        let name = attribute("name", id_tag).or_else(|| attribute("name", attributes)).unwrap_or_default();
        if name.is_empty() {
            continue;
        }
        friends.push(Friend { id: id.to_lowercase(), name: unescape(&name), tag: unescape(&attribute("tagline", id_tag).unwrap_or_default()), last_online: attribute("last_online", attributes).or_else(|| section("last_online", body).map(str::to_string)).unwrap_or_default(), ..Friend::default() });
    }
    friends
}

pub fn apply_presence(friends: &mut HashMap<String, Friend>, stanza: &str) {
    let open = &stanza[..stanza.find('>').unwrap_or(stanza.len())];
    let Some(from) = attribute("from", open) else { return };
    let id = from.split('@').next().unwrap_or_default().to_lowercase();
    let Some(friend) = friends.get_mut(&id) else { return };
    let games = section("games", stanza).unwrap_or("");
    let show = section("show", stanza).unwrap_or("chat");
    if let Some(seen) = section("last_online", stanza) {
        friend.last_online = seen.to_string();
    }
    if attribute("type", open).as_deref() == Some("unavailable") || show == "offline" || (show == "mobile" && games.is_empty()) {
        friend.online = false;
        return;
    }
    friend.online = true;
    friend.show = show.to_string();
    let product = ["valorant", "league_of_legends", "bacon", "lion", "tft", "keystone"].iter().find(|product| games.contains(&format!("<{product}"))).map(|product| product.to_string()).unwrap_or_default();
    if !(product.is_empty() || product == "keystone") || friend.product.is_empty() || friend.product == "keystone" {
        friend.product = product;
    }
    if let Some(league) = section("league_of_legends", games) {
        friend.playing = league.contains("inGame") || league.contains("championSelect") || show == "dnd";
        friend.icon = profile_icon(league).unwrap_or_default();
    }
    let payload = section("valorant", stanza)
        .and_then(|valorant| section("p", valorant))
        .and_then(|encoded| BASE64_STANDARD.decode(encoded).ok())
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok());
    if let Some(json) = payload {
        let read = |group: &str, key: &str| -> Value { json.get(group).and_then(|inner| inner.get(key)).or_else(|| json.get(key)).cloned().unwrap_or(Value::Null) };
        friend.state = read("matchPresenceData", "sessionLoopState").as_str().unwrap_or_default().to_string();
        friend.queue = read("matchPresenceData", "queueId").as_str().or(read("partyPresenceData", "queueId").as_str()).unwrap_or_default().to_string();
        friend.party_size = read("partyPresenceData", "partySize").as_i64().unwrap_or(1);
        friend.tier = read("playerPresenceData", "competitiveTier").as_i64().unwrap_or(0);
        friend.card = read("playerPresenceData", "playerCardId").as_str().unwrap_or_default().to_string();
        friend.title = read("playerPresenceData", "playerTitleId").as_str().unwrap_or_default().to_string();
        friend.party_max = read("partyPresenceData", "maxPartySize").as_i64().unwrap_or(5);
        friend.party_id = read("partyPresenceData", "partyId").as_str().unwrap_or_default().to_string();
        friend.party_state = read("partyPresenceData", "partyState").as_str().unwrap_or_default().to_string();
        friend.ally_score = read("partyPresenceData", "partyOwnerMatchScoreAllyTeam").as_i64().unwrap_or(0);
        friend.enemy_score = read("partyPresenceData", "partyOwnerMatchScoreEnemyTeam").as_i64().unwrap_or(0);
        friend.map = read("matchPresenceData", "matchMap").as_str().unwrap_or_default().to_string();
        friend.idle = json.get("isIdle").and_then(Value::as_bool).unwrap_or(false);
    }
}

fn affinity(token: &str) -> Option<String> {
    let payload = token.split('.').nth(1)?;
    let bytes = BASE64_URL_SAFE_NO_PAD.decode(payload).ok()?;
    serde_json::from_slice::<Value>(&bytes).ok()?["affinity"].as_str().map(str::to_string)
}

pub fn host_for(affinity: &str) -> (&'static str, &'static str) {
    let found = HOSTS.iter().find(|(key, _, _)| *key == affinity).unwrap_or(&HOSTS[0]);
    (found.1, found.2)
}

struct Link {
    stream: TlsStream<TcpStream>,
    buffer: String,
}

impl Link {
    async fn send(&mut self, text: &str) -> Result<(), String> {
        self.stream.write_all(text.as_bytes()).await.map_err(|_| "riotChatFailed".to_string())
    }

    async fn pull(&mut self, limit: Duration) -> Result<bool, String> {
        let mut chunk = [0u8; 8192];
        match tokio::time::timeout(limit, self.stream.read(&mut chunk)).await {
            Ok(Ok(0)) | Ok(Err(_)) => Err("riotChatFailed".into()),
            Ok(Ok(size)) => {
                self.buffer.push_str(&String::from_utf8_lossy(&chunk[..size]));
                Ok(true)
            }
            Err(_) => Ok(false),
        }
    }

    async fn until(&mut self, done: impl Fn(&str) -> bool) -> Result<String, String> {
        let deadline = Instant::now() + Duration::from_secs(15);
        while !done(&self.buffer) {
            if Instant::now() > deadline {
                return Err("riotChatFailed".into());
            }
            self.pull(Duration::from_secs(5)).await?;
        }
        Ok(std::mem::take(&mut self.buffer))
    }
}

async fn open(host: &'static str) -> Result<Link, String> {
    let mut roots = rustls::RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let config = rustls::ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .map_err(|_| "riotChatFailed".to_string())?
        .with_root_certificates(roots)
        .with_no_client_auth();
    let name = ServerName::try_from(host).map_err(|_| "riotChatFailed".to_string())?;
    let tcp = tokio::time::timeout(Duration::from_secs(10), TcpStream::connect((host, 5223))).await.map_err(|_| "riotChatFailed".to_string())?.map_err(|_| "riotChatFailed".to_string())?;
    let stream = TlsConnector::from(Arc::new(config)).connect(name, tcp).await.map_err(|_| "riotChatFailed".to_string())?;
    Ok(Link { stream, buffer: String::new() })
}

pub async fn friends(client: &reqwest::Client, access: &str, entitlements: &str) -> Result<Vec<Friend>, String> {
    let response = client.get("https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat").bearer_auth(access).send().await.map_err(|_| "riotUnreachable".to_string())?;
    if !response.status().is_success() {
        return Err("riotChatFailed".into());
    }
    let pas = response.text().await.map_err(|_| "riotChatFailed".to_string())?.trim_matches('"').trim().to_string();
    let (host, domain) = host_for(&affinity(&pas).unwrap_or_else(|| "eu1".into()));
    let mut link = open(host).await?;
    let header = format!("<?xml version=\"1.0\"?><stream:stream to=\"{domain}.pvp.net\" version=\"1.0\" xmlns:stream=\"http://etherx.jabber.org/streams\">");
    link.send(&header).await?;
    link.until(|text| text.contains("</stream:features>")).await?;
    link.send(&format!("<auth mechanism=\"X-Riot-RSO-PAS\" xmlns=\"urn:ietf:params:xml:ns:xmpp-sasl\"><rso_token>{access}</rso_token><pas_token>{pas}</pas_token></auth>")).await?;
    if !link.until(|text| text.contains("<success") || text.contains("<failure")).await?.contains("<success") {
        return Err("riotChatFailed".into());
    }
    link.send(&header).await?;
    link.until(|text| text.contains("</stream:features>")).await?;
    link.send("<iq id=\"_xmpp_bind1\" type=\"set\"><bind xmlns=\"urn:ietf:params:xml:ns:xmpp-bind\"><puuid-mode xmlns=\"urn:riotgames:rso\" enabled=\"true\"/><resource>RC-ETHONE</resource></bind></iq>").await?;
    link.until(|text| text.contains("_xmpp_bind1")).await?;
    link.send(&format!("<iq id=\"xmpp_entitlements_0\" type=\"set\"><entitlements xmlns=\"urn:riotgames:entitlements\"><token xmlns=\"\">{entitlements}</token></entitlements></iq>")).await?;
    link.until(|text| text.contains("xmpp_entitlements_0")).await?;
    link.send("<iq id=\"_xmpp_session1\" type=\"set\"><session xmlns=\"urn:ietf:params:xml:ns:xmpp-session\"><platform>riot</platform></session></iq>").await?;
    link.until(|text| text.contains("_xmpp_session1")).await?;
    link.send("<iq type=\"get\" id=\"ethone_roster\"><query xmlns=\"jabber:iq:riotgames:roster\" last_state=\"true\"/></iq>").await?;
    let roster = link.until(|text| text.contains("ethone_roster") && text.contains("</iq>")).await?;
    let mut map: HashMap<String, Friend> = parse_roster(&roster).into_iter().map(|friend| (friend.id.clone(), friend)).collect();
    link.send("<presence><show>offline</show><status></status></presence>").await?;
    let deadline = Instant::now() + Duration::from_secs(4);
    while Instant::now() < deadline {
        if link.pull(Duration::from_millis(800)).await.is_err() {
            break;
        }
        while let Some(start) = link.buffer.find("<presence") {
            let Some(length) = link.buffer[start..].find("</presence>").map(|end| end + 11).or_else(|| link.buffer[start..].find("/>").filter(|end| !link.buffer[start..start + end].contains('>')).map(|end| end + 2)) else { break };
            let stanza = link.buffer[start..start + length].to_string();
            apply_presence(&mut map, &stanza);
            link.buffer.drain(..start + length);
        }
    }
    let _ = link.send("</stream:stream>").await;
    let mut list: Vec<Friend> = map.into_values().collect();
    list.sort_by(|left, right| right.online.cmp(&left.online).then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase())));
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_roster_keeps_only_mutual_friends_with_a_name() {
        let xml = r#"<iq id='ethone_roster'><query><item jid='AAA@eu1.pvp.net' puuid='AAA' subscription='both'><id name='Rub &amp; Co' tagline='EUW'/></item><item puuid='BBB' subscription='pending_out'><id name='Non' tagline='X'/></item><item puuid='CCC' subscription='both'></item></query></iq>"#;
        let friends = parse_roster(xml);
        assert_eq!(friends.len(), 1);
        assert_eq!((friends[0].id.as_str(), friends[0].name.as_str(), friends[0].tag.as_str()), ("aaa", "Rub & Co", "EUW"));
    }

    #[test]
    fn presence_reads_valorant_state() {
        let mut map = HashMap::from([("aaa".to_string(), Friend { id: "aaa".into(), name: "Rub".into(), ..Friend::default() })]);
        let payload = BASE64_STANDARD.encode(r#"{"matchPresenceData":{"sessionLoopState":"INGAME","queueId":"competitive"},"partyPresenceData":{"partySize":3},"playerPresenceData":{"competitiveTier":27,"playerCardId":"c"}}"#);
        let stanza = format!("<presence from='AAA@eu1.pvp.net/RC'><show>chat</show><games><valorant><p>{payload}</p></valorant></games></presence>");
        apply_presence(&mut map, &stanza);
        let friend = &map["aaa"];
        assert!(friend.online);
        assert_eq!((friend.product.as_str(), friend.state.as_str(), friend.queue.as_str(), friend.tier, friend.party_size), ("valorant", "INGAME", "competitive", 27, 3));
    }

    #[test]
    fn presence_reads_party_score_card_and_map() {
        let mut map = HashMap::from([("aaa".to_string(), Friend { id: "aaa".into(), name: "Rub".into(), ..Friend::default() })]);
        let payload = BASE64_STANDARD.encode(r#"{"isIdle":true,"matchPresenceData":{"matchMap":"/Game/Maps/Bonsai/Bonsai"},"partyPresenceData":{"partyId":"p","partySize":3,"maxPartySize":5,"partyState":"MATCHMAKING","partyOwnerMatchScoreAllyTeam":7,"partyOwnerMatchScoreEnemyTeam":12},"playerPresenceData":{"playerTitleId":"t"}}"#);
        apply_presence(&mut map, &format!("<presence from='AAA@x/RC'><show>away</show><last_online>123</last_online><games><valorant><p>{payload}</p></valorant></games></presence>"));
        let friend = &map["aaa"];
        assert_eq!((friend.party_id.as_str(), friend.party_max, friend.ally_score, friend.enemy_score, friend.idle), ("p", 5, 7, 12, true));
        assert_eq!((friend.map.as_str(), friend.title.as_str(), friend.show.as_str(), friend.last_online.as_str(), friend.party_state.as_str()), ("/Game/Maps/Bonsai/Bonsai", "t", "away", "123", "MATCHMAKING"));
    }

    #[test]
    fn the_riot_client_does_not_hide_the_game_being_played() {
        let mut map = HashMap::from([("aaa".to_string(), Friend { id: "aaa".into(), name: "Rub".into(), ..Friend::default() })]);
        apply_presence(&mut map, "<presence from='AAA@x/VAL'><show>chat</show><games><valorant><p>e30=</p></valorant></games></presence>");
        apply_presence(&mut map, "<presence from='AAA@x/RC'><show>chat</show><games><keystone><st>chat</st></keystone></games></presence>");
        assert_eq!(map["aaa"].product, "valorant");
    }

    #[test]
    fn league_presence_reads_the_profile_icon() {
        let mut map = HashMap::from([("aaa".to_string(), Friend { id: "aaa".into(), name: "Rub".into(), ..Friend::default() })]);
        apply_presence(&mut map, "<presence from='AAA@x/RC'><show>dnd</show><games><league_of_legends><st>dnd</st><p>{&quot;gameStatus&quot;:&quot;inGame&quot;,&quot;profileIcon&quot;:&quot;4567&quot;}</p></league_of_legends></games></presence>");
        assert!(map["aaa"].playing);
        assert!(map["aaa"].icon.ends_with("/4567.jpg"));
    }

    #[test]
    fn offline_presence_and_strangers_are_handled() {
        let mut map = HashMap::from([("aaa".to_string(), Friend { id: "aaa".into(), online: true, ..Friend::default() })]);
        apply_presence(&mut map, "<presence from='AAA@x' type='unavailable'/>");
        assert!(!map["aaa"].online);
        apply_presence(&mut map, "<presence from='ZZZ@x'><show>chat</show></presence>");
        assert_eq!(map.len(), 1);
    }

    #[test]
    fn unknown_regions_fall_back_on_europe() {
        assert_eq!(host_for("kr1").0, "kr1.chat.si.riotgames.com");
        assert_eq!(host_for("inconnu").1, "eu1");
    }
}
