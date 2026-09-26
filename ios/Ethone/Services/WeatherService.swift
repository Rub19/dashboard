import Foundation
import Observation

struct WeatherHour: Identifiable, Hashable {
    let time: String
    let temperature: Double
    let rainChance: Int
    let code: Int
    let isDay: Bool
    var id: String { time }
    var hourLabel: String { String(time.suffix(5)) }
}

struct WeatherDay: Identifiable, Hashable {
    let date: String
    let code: Int
    let max: Double
    let min: Double
    let rainChance: Int
    var id: String { date }
}

struct WeatherNow: Hashable {
    let temperature: Double
    let feelsLike: Double
    let humidity: Int
    let wind: Double
    let gusts: Double
    let pressure: Double
    let precipitation: Double
    let code: Int
    let isDay: Bool
}

/// Météo via Open-Meteo (service public, sans clé) — la même source que le site en repli.
@MainActor
@Observable
final class WeatherService {
    private(set) var placeName = ""
    private(set) var now: WeatherNow?
    private(set) var hours: [WeatherHour] = []
    private(set) var days: [WeatherDay] = []
    private(set) var isLoading = false
    private(set) var updatedAt: Date?
    var errorMessage: String?

    func load(city: String) async {
        let query = city.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let place = try await geocode(query)
            let forecast = try await fetchForecast(latitude: place.latitude, longitude: place.longitude)
            placeName = [place.name, place.country].compactMap { $0 }.joined(separator: ", ")
            apply(forecast)
            updatedAt = Date()
            errorMessage = nil
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: Réseau

    private struct GeoResponse: Decodable {
        struct Place: Decodable {
            let name: String
            let country: String?
            let latitude: Double
            let longitude: Double
        }
        let results: [Place]?
    }

    private func geocode(_ city: String) async throws -> GeoResponse.Place {
        var components = URLComponents(string: "https://geocoding-api.open-meteo.com/v1/search")!
        components.queryItems = [
            URLQueryItem(name: "name", value: city),
            URLQueryItem(name: "count", value: "1"),
            URLQueryItem(name: "language", value: "fr"),
            URLQueryItem(name: "format", value: "json"),
        ]
        let (data, http) = try await HTTP.send(URLRequest(url: components.url!))
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(status: http.statusCode, code: nil, message: "Recherche de la ville impossible.") }
        let decoded = try JSONDecoder().decode(GeoResponse.self, from: data)
        guard let place = decoded.results?.first else {
            throw APIError.http(status: 404, code: nil, message: "Ville introuvable : \(city).")
        }
        return place
    }

    private struct Forecast: Decodable {
        struct Current: Decodable {
            let time: String
            let temperature_2m: Double
            let relative_humidity_2m: Int
            let apparent_temperature: Double
            let is_day: Int
            let precipitation: Double
            let weather_code: Int
            let surface_pressure: Double
            let wind_speed_10m: Double
            let wind_gusts_10m: Double
        }
        struct Hourly: Decodable {
            let time: [String]
            let temperature_2m: [Double?]
            let precipitation_probability: [Int?]
            let weather_code: [Int?]
            let is_day: [Int?]
        }
        struct Daily: Decodable {
            let time: [String]
            let weather_code: [Int?]
            let temperature_2m_max: [Double?]
            let temperature_2m_min: [Double?]
            let precipitation_probability_max: [Int?]
        }
        let current: Current
        let hourly: Hourly
        let daily: Daily
    }

    private func fetchForecast(latitude: Double, longitude: Double) async throws -> Forecast {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "current", value: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m"),
            URLQueryItem(name: "hourly", value: "temperature_2m,precipitation_probability,weather_code,is_day"),
            URLQueryItem(name: "daily", value: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "forecast_days", value: "7"),
        ]
        let (data, http) = try await HTTP.send(URLRequest(url: components.url!))
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(status: http.statusCode, code: nil, message: "Prévisions indisponibles.") }
        do {
            return try JSONDecoder().decode(Forecast.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    private func apply(_ forecast: Forecast) {
        let c = forecast.current
        now = WeatherNow(temperature: c.temperature_2m, feelsLike: c.apparent_temperature, humidity: c.relative_humidity_2m,
                         wind: c.wind_speed_10m, gusts: c.wind_gusts_10m, pressure: c.surface_pressure,
                         precipitation: c.precipitation, code: c.weather_code, isDay: c.is_day == 1)

        let h = forecast.hourly
        // Les heures ont toutes le format « yyyy-MM-ddTHH:mm » : la comparaison de chaînes suffit pour trouver l'heure courante.
        let start = h.time.firstIndex(where: { $0 >= c.time }) ?? 0
        hours = (start..<min(h.time.count, start + 24)).compactMap { index in
            guard index < h.temperature_2m.count, let temperature = h.temperature_2m[index] else { return nil }
            return WeatherHour(
                time: h.time[index],
                temperature: temperature,
                rainChance: (index < h.precipitation_probability.count ? h.precipitation_probability[index] : nil) ?? 0,
                code: (index < h.weather_code.count ? h.weather_code[index] : nil) ?? 0,
                isDay: ((index < h.is_day.count ? h.is_day[index] : nil) ?? 1) == 1
            )
        }

        let d = forecast.daily
        days = d.time.indices.compactMap { index in
            guard let maxT = d.temperature_2m_max[index], let minT = d.temperature_2m_min[index] else { return nil }
            return WeatherDay(
                date: d.time[index],
                code: (d.weather_code[index]) ?? 0,
                max: maxT,
                min: minT,
                rainChance: (index < d.precipitation_probability_max.count ? d.precipitation_probability_max[index] : nil) ?? 0
            )
        }
    }
}

enum WeatherCode {
    static func label(_ code: Int) -> String {
        switch code {
        case 0: return "Ciel dégagé"
        case 1: return "Plutôt dégagé"
        case 2: return "Partiellement nuageux"
        case 3: return "Couvert"
        case 45, 48: return "Brouillard"
        case 51, 53, 55: return "Bruine"
        case 56, 57: return "Bruine verglaçante"
        case 61: return "Pluie légère"
        case 63: return "Pluie"
        case 65: return "Pluie forte"
        case 66, 67: return "Pluie verglaçante"
        case 71: return "Neige légère"
        case 73: return "Neige"
        case 75: return "Neige forte"
        case 77: return "Grains de neige"
        case 80: return "Averses légères"
        case 81: return "Averses"
        case 82: return "Averses violentes"
        case 85, 86: return "Averses de neige"
        case 95: return "Orage"
        case 96, 99: return "Orage avec grêle"
        default: return "—"
        }
    }

    static func symbol(_ code: Int, isDay: Bool = true) -> String {
        switch code {
        case 0: return isDay ? "sun.max.fill" : "moon.stars.fill"
        case 1: return isDay ? "sun.min.fill" : "moon.fill"
        case 2: return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
        case 3: return "cloud.fill"
        case 45, 48: return "cloud.fog.fill"
        case 51, 53, 55, 56, 57: return "cloud.drizzle.fill"
        case 61, 63, 66, 67, 80, 81: return "cloud.rain.fill"
        case 65, 82: return "cloud.heavyrain.fill"
        case 71, 73, 75, 77, 85, 86: return "cloud.snow.fill"
        case 95, 96, 99: return "cloud.bolt.rain.fill"
        default: return "questionmark.circle"
        }
    }
}
