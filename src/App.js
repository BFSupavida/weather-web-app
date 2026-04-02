// ============================================================
// 🌤️ WEATHER APP — React Functional Component
// ใช้ OpenWeatherMap API (ต้องใส่ API Key ของตัวเอง)
// Features: Search, Geolocation, °C/°F toggle, 5-day forecast,
//           Dynamic background, Loading state, Error handling
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";


// ─── CONFIG ────────────────────────────────────────────────
// ⚠️  ใส่ API Key ในไฟล์ .env เป็น REACT_APP_API_KEY=your_api_key
const API_KEY = process.env.REACT_APP_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ─── WEATHER THEME MAP ──────────────────────────────────────
// กำหนด gradient + ไอคอน + สีตามสภาพอากาศ
const WEATHER_THEMES = {
  Clear: {
    gradient: "linear-gradient(135deg, #274B66 0%, #3E7FAF 45%, #6C5CE7 100%)",
    particle: "☀️",
    accent: "#F7B7D2",
    label: "ท้องฟ้าแจ่มใส",
  },
  Clouds: {
    gradient: "linear-gradient(135deg, #3A3F5A 0%, #5A7FA6 50%, #A7C4E7 100%)",
    particle: "☁️",
    accent: "#A7C7E7",
    label: "มีเมฆ",
  },
  Rain: {
    gradient: "linear-gradient(135deg, #1F2A44 0%, #2F6DAE 55%, #8BE9FF 100%)",
    particle: "🌧️",
    accent: "#9BF6FF",
    label: "ฝนตก",
  },
  Drizzle: {
    gradient: "linear-gradient(135deg, #233A3A 0%, #2F7A7A 52%, #B9FBC0 100%)",
    particle: "🌦️",
    accent: "#B9FBC0",
    label: "ฝนปรอย",
  },
  Thunderstorm: {
    gradient: "linear-gradient(135deg, #15162A 0%, #3A2A6A 55%, #D6A6FF 100%)",
    particle: "⛈️",
    accent: "#D6A6FF",
    label: "พายุฝนฟ้าคะนอง",
  },
  Snow: {
    gradient: "linear-gradient(135deg, #153A5A 0%, #2B7CC9 50%, #E3F3FF 100%)",
    particle: "❄️",
    accent: "#BDE0FE",
    label: "หิมะตก",
  },
  Mist: {
    gradient: "linear-gradient(135deg, #2B2F36 0%, #49697A 55%, #CDE6EE 100%)",
    particle: "🌫️",
    accent: "#CDE6EE",
    label: "หมอก",
  },
  default: {
    gradient: "linear-gradient(135deg, #223049 0%, #3A6EA5 50%, #6FB3D2 100%)",
    particle: "🌡️",
    accent: "#C8E7FF",
    label: "สภาพอากาศ",
  },
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────
const getTheme = (main) => WEATHER_THEMES[main] || WEATHER_THEMES.default;

// แปลง Unix timestamp → วันที่ภาษาไทย
const formatDate = (dt, timezone) => {
  const d = new Date((dt + timezone) * 1000);
  return d.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

// แปลง Unix timestamp → เวลา HH:MM
const formatTime = (dt, timezone) => {
  const d = new Date((dt + timezone) * 1000);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
};

// แปลง Unix timestamp → ชื่อวัน
const formatDay = (dt) => {
  const d = new Date(dt * 1000);
  return d.toLocaleDateString("th-TH", { weekday: "short" });
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────

/** ปุ่ม °C / °F toggle */
function UnitToggle({ unit, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "1.5px solid rgba(255,255,255,0.25)",
        borderRadius: "50px",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "6px 14px",
        fontSize: "15px",
        fontFamily: "inherit",
        fontWeight: 600,
        letterSpacing: "0.5px",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s",
      }}
      title="สลับหน่วยอุณหภูมิ"
    >
      <span style={{ opacity: unit === "metric" ? 1 : 0.45 }}>°C</span>
      <span style={{ opacity: 0.4, margin: "0 2px" }}>|</span>
      <span style={{ opacity: unit === "imperial" ? 1 : 0.45 }}>°F</span>
    </button>
  );
}

/** สถิติย่อย (ความชื้น / ลม / ทัศนวิสัย) */
function StatCard({ icon, label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "18px",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        flex: 1,
        minWidth: "90px",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>{value}</span>
    </div>
  );
}

/** การ์ดพยากรณ์ 5 วัน */
function ForecastCard({ day, icon, high, low, unit }) {
  const sym = unit === "metric" ? "°C" : "°F";
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px",
        padding: "14px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        flex: 1,
        minWidth: "70px",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>{day}</span>
      <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt="" width={44} height={44} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }} />
      <span style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{Math.round(high)}{sym}</span>
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{Math.round(low)}{sym}</span>
    </div>
  );
}

function CityWeatherCard({ result, sym, windUnit, theme, unit }) {
  const { weather, forecast } = result;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "24px",
        padding: "28px 28px 24px",
        marginTop: "20px",
        backdropFilter: "blur(16px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }}>
            {weather.name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", marginTop: "4px" }}>
            {weather.sys.country} · {formatDate(weather.dt, weather.timezone)}
          </div>
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "4px", textTransform: "capitalize" }}>
            {weather.weather[0].description}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "4px" }}>
            รู้สึกเหมือน {Math.round(weather.main.feels_like)}{sym} · สูง {Math.round(weather.main.temp_max)}{sym} / ต่ำ {Math.round(weather.main.temp_min)}{sym}
          </div>
        </div>
        <img
          src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
          alt={weather.weather[0].description}
          width={90}
          height={90}
          style={{
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
            marginRight: "-8px",
            marginTop: "-8px",
          }}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            color: "#fff",
            fontSize: "80px",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-3px",
            textShadow: `0 4px 24px ${theme.accent}88`,
          }}
        >
          {Math.round(weather.main.temp)}
          <span style={{ fontSize: "36px", fontWeight: 500, opacity: 0.7 }}>{sym}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <StatCard icon="💧" label="ความชื้น" value={`${weather.main.humidity}%`} />
        <StatCard icon="💨" label="ลม" value={`${weather.wind.speed} ${windUnit}`} />
        <StatCard icon="🌡️" label="ความกดอากาศ" value={`${weather.main.pressure} hPa`} />
        <StatCard icon="👁️" label="ทัศนวิสัย" value={`${(weather.visibility / 1000).toFixed(1)} กม.`} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: "24px" }}>🌅</span>
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>พระอาทิตย์ขึ้น</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px" }}>{formatTime(weather.sys.sunrise, weather.timezone)}</div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: "24px" }}>🌇</span>
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>พระอาทิตย์ตก</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px" }}>{formatTime(weather.sys.sunset, weather.timezone)}</div>
          </div>
        </div>
      </div>

      {forecast.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "20px",
            padding: "18px",
            marginTop: "12px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: "14px" }}>
            พยากรณ์ 5 วันข้างหน้า
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {forecast.map((d, i) => (
              <ForecastCard key={i} day={formatDay(d.dt)} icon={d.icon} high={d.high} low={d.low} unit={unit} />
            ))}
          </div>
        </div>
      )}

      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", textAlign: "center", marginTop: "20px" }}>
        ข้อมูลจาก OpenWeatherMap · อัปเดต {formatTime(weather.dt, weather.timezone)} น.
      </div>
    </div>
  );
}

/** ข้อความ error */
function ErrorBanner({ message }) {
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.15)",
        border: "1.5px solid rgba(239,68,68,0.4)",
        borderRadius: "14px",
        padding: "14px 20px",
        color: "#fca5a5",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
        fontWeight: 500,
        backdropFilter: "blur(8px)",
        marginTop: "12px",
      }}
    >
      <span style={{ fontSize: "20px" }}>⚠️</span>
      {message}
    </div>
  );
}

/** Loading spinner */
function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.12)",
          borderTop: "3px solid rgba(255,255,255,0.85)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px" }}>กำลังโหลดข้อมูลสภาพอากาศ…</span>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function WeatherApp() {
  const [query, setQuery] = useState("");
  const [weatherResults, setWeatherResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("metric"); // "metric" | "imperial"
  const [theme, setTheme] = useState(WEATHER_THEMES.default);
  const [lastLocation, setLastLocation] = useState(null);
  const inputRef = useRef(null);

  const parseCityList = (input) =>
    input
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean);

  const formatApiError = (res) => {
    if (res.status === 404) throw new Error("ไม่พบเมืองที่ระบุ กรุณาตรวจสอบการสะกดชื่อ");
    if (res.status === 401) throw new Error("API Key ไม่ถูกต้อง กรุณาตรวจสอบ API Key");
    throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง");
  };

  const fetchWeatherByLocation = useCallback(async (locationParam) => {
    const wRes = await fetch(
      `${BASE_URL}/weather?${locationParam}&units=${unit}&appid=${API_KEY}&lang=th`
    );
    if (!wRes.ok) formatApiError(wRes);
    const wData = await wRes.json();

    const fRes = await fetch(
      `${BASE_URL}/forecast?${locationParam}&units=${unit}&appid=${API_KEY}&lang=th`
    );
    if (!fRes.ok) formatApiError(fRes);
    const fData = await fRes.json();

    const dailyMap = {};
    fData.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyMap[date]) dailyMap[date] = [];
      dailyMap[date].push(item);
    });
    const days = Object.values(dailyMap)
      .slice(0, 5)
      .map((items) => ({
        dt: items[0].dt,
        icon: items[0].weather[0].icon,
        high: Math.max(...items.map((i) => i.main.temp_max)),
        low: Math.min(...items.map((i) => i.main.temp_min)),
      }));

    return { weather: wData, forecast: days };
  }, [unit]);

  const fetchCityWeather = useCallback(async (city) => {
    try {
      return await fetchWeatherByLocation(`q=${encodeURIComponent(city)}`);
    } catch (err) {
      throw new Error(`${city}: ${err.message}`);
    }
  }, [fetchWeatherByLocation]);

  const fetchWeather = useCallback(
    async (cityOrCoords) => {
      setLoading(true);
      setError("");
      setWeatherResults([]);

      const isCoords = typeof cityOrCoords === "object";

      try {
        if (isCoords) {
          const result = await fetchWeatherByLocation(`lat=${cityOrCoords.lat}&lon=${cityOrCoords.lon}`);
          setWeatherResults([result]);
          setTheme(getTheme(result.weather.weather[0].main));
        } else {
          const cities = parseCityList(cityOrCoords);
          if (cities.length === 0) throw new Error("กรุณาใส่ชื่อเมืองอย่างน้อยหนึ่งเมือง");

          const settled = await Promise.allSettled(cities.map((city) => fetchCityWeather(city)));
          const successes = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
          const failures = settled
            .filter((r) => r.status === "rejected")
            .map((r) => r.reason.message.replace(/^(.+?):\s*/, ""));

          if (successes.length === 0) throw new Error(`ไม่สามารถดึงข้อมูลได้สำหรับ: ${failures.join(", ")}`);
          setWeatherResults(successes);
          setTheme(getTheme(successes[0].weather.weather[0].main));
          if (failures.length > 0) setError(`ไม่สามารถดึงข้อมูลได้สำหรับ: ${failures.join(", ")}`);
        }
      } catch (err) {
        setError(err.message);
        setWeatherResults([]);
        setTheme(WEATHER_THEMES.default);
      } finally {
        setLoading(false);
      }
    },
    [fetchCityWeather, fetchWeatherByLocation]
  );

  useEffect(() => {
    if (!lastLocation) return;
    fetchWeather(lastLocation.value);
  }, [unit, lastLocation, fetchWeather]);

  // ─── Geolocation ────────────────────────────────────────
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Browser ไม่รองรับ Geolocation");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLastLocation({ type: "coords", value: { lat: pos.coords.latitude, lon: pos.coords.longitude } });
      },
      () => setError("ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง")
    );
  };

  // ─── Search handler ──────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setLastLocation({ type: "query", value: trimmedQuery });
  };

  // ─── Derived values ──────────────────────────────────────
  const sym = unit === "metric" ? "°C" : "°F";
  const windUnit = unit === "metric" ? "ม./วินาที" : "ไมล์/ชม.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.gradient,
        backgroundAttachment: "fixed",
        transition: "background 1.2s ease",
        fontFamily: "'Sarabun', 'Noto Sans Thai', 'DM Sans', sans-serif",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px 60px",
      }}
    >
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 0; }
        body { margin: 0; }
      `}</style>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          animation: "fadeSlideUp 0.6s ease both",
        }}
      >
        {/* ── Header Row ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600 }}>
              Weather App
            </div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: 700, marginTop: "2px" }}>
              สภาพอากาศ 🌍
            </div>
          </div>
          <UnitToggle unit={unit} onToggle={() => setUnit((u) => (u === "metric" ? "imperial" : "metric"))} />
        </div>

        {/* ── Search Bar ── */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
          {/* Text input */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: "16px",
              padding: "0 16px",
              gap: "10px",
              backdropFilter: "blur(12px)",
              transition: "border 0.2s",
            }}
          >
            <span style={{ fontSize: "18px", opacity: 0.6 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเมือง เช่น Bangkok, Tokyo…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "15px",
                fontFamily: "inherit",
                padding: "14px 0",
              }}
            />
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: theme.accent,
              border: "none",
              borderRadius: "16px",
              color: "#0d1b2a",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "15px",
              fontFamily: "inherit",
              padding: "0 20px",
              whiteSpace: "nowrap",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
              boxShadow: `0 4px 20px ${theme.accent}55`,
            }}
          >
            ค้นหา
          </button>

          {/* Geolocation button */}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={loading}
            title="ใช้ตำแหน่งปัจจุบัน"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: "16px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "20px",
              padding: "0 16px",
              opacity: loading ? 0.6 : 1,
              backdropFilter: "blur(8px)",
              transition: "all 0.2s",
            }}
          >
            📍
          </button>
        </form>

        {/* ── Error Banner ── */}
        {error && <ErrorBanner message={error} />}

        {/* ── Loading Spinner ── */}
        {loading && <Spinner />}

        {/* ── Weather Display ── */}
        {!loading && weatherResults.length > 0 && (
          <div style={{ animation: "fadeSlideUp 0.5s ease both" }}>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", marginBottom: "10px" }}>
              แสดงผลสำหรับ {weatherResults.length} เมือง
            </div>
            {weatherResults.map((result) => (
              <CityWeatherCard
                key={`${result.weather.id}-${result.weather.name}-${result.weather.sys.country}`}
                result={result}
                sym={sym}
                windUnit={windUnit}
                theme={theme}
                unit={unit}
              />
            ))}
          </div>
        )}

        {/* ── Welcome State (ยังไม่ได้ค้นหา) ── */}
        {!loading && weatherResults.length === 0 && !error && (
          <div
            style={{
              textAlign: "center",
              marginTop: "60px",
              animation: "fadeSlideUp 0.6s ease both",
            }}
          >
            <div style={{ fontSize: "72px", marginBottom: "16px" }}>🌤️</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              ค้นหาสภาพอากาศของคุณ
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", lineHeight: 1.6 }}>
              พิมพ์ชื่อเมืองในช่องค้นหา<br />หรือกด 📍 เพื่อใช้ตำแหน่งปัจจุบัน
            </div>
            <button
              onClick={handleGeolocate}
              style={{
                marginTop: "24px",
                background: theme.accent,
                border: "none",
                borderRadius: "50px",
                color: "#0d1b2a",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: "15px",
                padding: "12px 28px",
                boxShadow: `0 4px 20px ${theme.accent}55`,
              }}
            >
              📍 ใช้ตำแหน่งของฉัน
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
