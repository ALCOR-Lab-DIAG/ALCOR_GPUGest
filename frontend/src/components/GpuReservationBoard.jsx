import React, { useEffect, useState } from "react";
import DatePicker from "react-multi-date-picker";
import "./GpuReservationBoard.css";

const GPUs = [
  "GTX1080_0@192.168.110.41",
  "GTX1080_1@192.168.110.41",
  "GTX1080_2@192.168.110.41",
  "GTX1080_3@192.168.110.41",
  "TitanV_0@192.168.110.40",
  "TitanV_1@192.168.110.40",
  "TitanV_2@192.168.110.40",
  "TitanV_3@192.168.110.40",
  "RTX5000_0@192.168.110.52",
  "RTX5000_1@192.168.110.52",
  "RTX5000_2@192.168.110.52",
  "RTX5000_3@192.168.110.52",
  "RTX5000_4@192.168.110.52",
  "RTX5000_5@192.168.110.52",
  "RTX5000_6@192.168.110.52",
  "RTX5000_7@192.168.110.52"
];

export default function GpuReservationBoard() {
  const [reservations, setReservations] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authTab, setAuthTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || "");

  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedGpus, setSelectedGpus] = useState([]);
  const [selectedDeleteReservations, setSelectedDeleteReservations] = useState([]);
  const [authError, setAuthError] = useState("");
  const [showError, setShowError] = useState(false);

  const [isThesisStudent, setIsThesisStudent] = useState(false);
  const [tutorName, setTutorName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getMaintenanceDates = () => {
    const maintenanceDates = [];
    const startYear = 2024;
    const currentYear = new Date().getFullYear();
    
    for (let year = startYear; year <= currentYear + 1; year++) {
      // Marzo (31), Giugno (30), Settembre (30), Dicembre (31)
      const dates = [
        `${year}-03-31`,
        `${year}-06-30`, 
        `${year}-09-30`,
        `${year}-12-31`
      ];
      maintenanceDates.push(...dates);
    }
    
    return maintenanceDates;
  };

  const maintenanceDates = getMaintenanceDates();
  const getGpuCategoryClass = (gpu) => {
    if (gpu.includes('GTX1080')) return 'gpu-name-gtx1080';
    if (gpu.includes('TitanV')) return 'gpu-name-titanv';
    if (gpu.includes('RTX5000')) return 'gpu-name-rtx5000';
    return '';
  };

  const isCategorySeparator = (gpu) => {
    return gpu === 'GTX1080_3@192.168.110.41' || gpu === 'TitanV_3@192.168.110.40';
  };

  const today = new Date();
  const days = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (token) {
      fetch("http://192.168.1.89:8000/reservations", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then((res) => {
          if (!res.ok) {
            console.warn("GET /reservations failed:", res.status);
            return [];  // fallback a array vuoto
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setReservations(data);
          } else {
            console.error("Unexpected response:", data);
            setReservations([]);  // fallback
          }
        })
        .catch((err) => console.error("Fetch Error:", err));
    }
  }, [token]);


  const refreshReservations = () => {
    fetch("http://192.168.1.89:8000/reservations", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(setReservations)
    .catch(err => console.error("Fetch Error:", err));
  };

  const userReservations = Array.isArray(reservations)
    ? reservations.filter(r => r.email === userEmail)
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formattedDays = selectedDays.map(d => d?.format?.("YYYY-MM-DD") ?? d);

    fetch("http://192.168.1.89:8000/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        gpu_ids: selectedGpus,
        days: formattedDays
      })
    })
      .then(res => res.json())
      .then(() => {
        setShowCreateModal(false);
        setSelectedDays([]);
        setSelectedGpus([]);
        refreshReservations();
      })
      .catch(err => console.error("POST Error:", err))
      .finally(() => setIsLoading(false));
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const gpu_ids = selectedDeleteReservations.map(k => k.split("|")[0]);
    const days = selectedDeleteReservations.map(k => k.split("|")[1]);

    fetch("http://192.168.1.89:8000/reservations", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ gpu_ids, days })
    })
      .then(res => res.json())
      .then(() => {
        setShowDeleteModal(false);
        setSelectedDeleteReservations([]);
        refreshReservations();
      })
      .catch(err => console.error("DELETE Error:", err))
      .finally(() => setIsLoading(false));
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Avvio caricamento

    const url = authTab === "register" ? "/register" : "/login";
    const payload = authTab === "register"
      ? {
          name,
          email,
          password,
          is_thesis_student: isThesisStudent,
          tutor_name: isThesisStudent ? tutorName : null
        }
      : new URLSearchParams({ username: email, password });

    try {
      const res = await fetch(`http://192.168.1.89:8000${url}`, {
        method: "POST",
        headers: {
          "Content-Type": authTab === "register" ? "application/json" : "application/x-www-form-urlencoded"
        },
        body: authTab === "register" ? JSON.stringify(payload) : payload
      });

      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        setUserEmail(email);
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userEmail", email);
        setShowAuthModal(false);
      } else {
        setAuthError(data.detail || "Authentication error");
        setShowError(true);
        setTimeout(() => setShowError(false), 4000);
      }
    } catch (err) {
      alert("Connection error.");
      console.error("Auth error:", err);
    } finally {
      setIsLoading(false); // Fine caricamento
    }
  };

  const logout = () => {
    setToken("");
    setUserEmail("");
    localStorage.clear();
    setShowAuthModal(true);
  };


  const toggleSelection = (array, setter, value) => {
    setter(array.includes(value) ? array.filter(v => v !== value) : [...array, value]);
  };

  if (showAuthModal) {
    return (
      <>
        {showError && (
          <div className="auth-error-popup">{authError}</div>
        )}
        <div className="modal">
          <div className="modal-content">
            <div className="tab-buttons">
              <button className={authTab === "login" ? "active" : ""} onClick={() => setAuthTab("login")}>Login</button>
              <button className={authTab === "register" ? "active" : ""} onClick={() => setAuthTab("register")}>Sign Up</button>
            </div>
            <h3 className="auth-modal-title">{authTab === "login" ? "Log in to your account" : "Create a new account"}</h3>
            <form onSubmit={handleAuth}>
              {authTab === "register" && (
                  <>
                    <input
                      placeholder="Name (username of server's account)"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />

                    <label class="thesis-student-label">
                      <input
                        type="checkbox"
                        checked={isThesisStudent}
                        onChange={e => setIsThesisStudent(e.target.checked)}
                      />{" "}
                      Thesis student
                    </label>

                    {isThesisStudent && (
                      <input
                        type="text"
                        placeholder="Tutor name"
                        value={tutorName}
                        onChange={e => setTutorName(e.target.value)}
                        required
                      />
                    )}
                  </>
                )}
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <div className="modal-actions">
                <button type="submit" disabled={isLoading}>
                  {isLoading ? "⏳ Please wait..." : authTab === "login" ? "Login" : "Registrati"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="gpu-container">
      <div className="gpu-header">
        <h2>GPU Reservation System - ALCOR Lab</h2>
        <div>
          <button onClick={() => setShowCreateModal(true)}>Book GPUs</button>
          <button onClick={() => setShowDeleteModal(true)}>Delete reservations</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="gpu-table-wrapper">
        <table className="gpu-table">
          <thead>
            <tr>
              <th>GPU</th>
              {days.map(day => <th key={day}>{day.slice(5)}</th>)}
            </tr>
          </thead>
          <tbody>
            {GPUs.map(gpu => (
              <tr key={gpu} className={isCategorySeparator(gpu) ? 'category-separator' : ''}>
                <td className={getGpuCategoryClass(gpu)}>{gpu}</td>
                {days.map(day => {
                  const r = (Array.isArray(reservations) && reservations.length > 0)
                    ? reservations.find(res => res.gpu_id === gpu && res.day === day)
                    : null;
                  const isMine = r?.email === userEmail;
                  const isMaintenanceDay = maintenanceDates.includes(day);
                  let cellClass = isMine ? "highlight-cell" : "";
                  let cellContent = "";

                  if (r) {
                    cellContent = r.user_name;
                    if (r.tutor_name) {
                      cellContent += ` <span class="tutor-indicator" data-tutor="${r.tutor_name}">T</span>`;
                    }
                  }
                  
                  // Tooltip per manutenzione
                  const tooltipParts = [];
                  if (r?.tutor_name) tooltipParts.push(`Tutor: ${r.tutor_name}`);
                  if (isMaintenanceDay) tooltipParts.push("Scheduled maintenance (~30 min)");
                  const tooltip = tooltipParts.join(" • ");

                  // Icona manutenzione
                  if (isMaintenanceDay) {
                    cellClass += " maintenance-cell";
                    cellContent = cellContent ? `${cellContent} 🔧` : "🔧";
                  }

                  return <td key={day} className={cellClass} title="" dangerouslySetInnerHTML={{__html: cellContent}}></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Book GPUs</h3>
            <form onSubmit={handleSubmit}>
              <label>GPU:</label>
              <div className="scroll-box">
                {GPUs.map(gpu => (
                  <label key={gpu}>
                    <input
                      type="checkbox"
                      checked={selectedGpus.includes(gpu)}
                      onChange={() => toggleSelection(selectedGpus, setSelectedGpus, gpu)}
                    />{' '}
                    {gpu}
                  </label>
                ))}
              </div>

              {selectedGpus.length === 0 ? (
                <p style={{ color: '#888' }}>⚠️ Please select at least one GPU first</p>
              ) : (
                <>
                  <label>Giorni:</label>
                  <DatePicker
                     multiple
                     value={selectedDays}
                     onChange={setSelectedDays}
                     format="YYYY-MM-DD"
                     mapDays={({ date }) => {
                       const day = date.format("YYYY-MM-DD");
                       const todayStr = new Date()
                         .toISOString()
                         .split("T")[0];
 
                       // 1) disabilita le date passate
                       if (day < todayStr) {
                         return {
                           disabled: true,
                           style: {
                             color: "#ccc",
                             cursor: "not-allowed"
                           }
                         };
                       }
 
                       // 2) disabilita se già prenotata per le GPU selezionate
                       if (maintenanceDates.includes(day)) {
                          return {
                            style: {
                              backgroundColor: "#fff3cd",
                              border: "2px solid #ffc107",
                              fontWeight: "bold"
                            }
                          };
                        }

                        // 3) disabilita se già prenotata per le GPU selezionate
                        const isBooked = selectedGpus.some(gpu =>
                         reservations.some(r =>
                           r.gpu_id === gpu && r.day === day
                         )
                       );
                       if (isBooked) {
                         return {
                           disabled: true,
                           style: {
                             textDecoration: "line-through",
                             cursor: "not-allowed"
                           }
                         };
                       }
 
                       return {};
                     }}
                   />
                  <small style={{ color: '#888' }}>
                    Already booked days are disabled. Days highlighted in yellow have scheduled maintenance (~30 min).
                  </small>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="submit"
                  disabled={selectedGpus.length === 0 || selectedDays.length === 0 || isLoading}
                >
                  {isLoading ? "⏳ Booking..." : "Confirm"}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Delete reservations</h3>

            {userReservations.length === 0 ? (
              <p>No reservations to delete.</p>
            ) : (
              <form onSubmit={handleDelete}>
                <div className="scroll-box">
                  {userReservations.map(r => {
                    const key = `${r.gpu_id}|${r.day}`;
                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={selectedDeleteReservations.includes(key)}
                          onChange={() => {
                            setSelectedDeleteReservations(prev =>
                              prev.includes(key)
                                ? prev.filter(k => k !== key)
                                : [...prev, key]
                            );
                          }}
                        />{' '}
                        {`${r.gpu_id} – ${r.day}`}
                      </label>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <button
                    type="submit"
                    disabled={selectedDeleteReservations.length === 0 || isLoading}
                  >
                    {isLoading ? "⏳ Deleting..." : "Conferma"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
