import { useState } from 'react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(() => {
    const savedProfile = localStorage.getItem('stroke_shield_active_user');
    return savedProfile ? JSON.parse(savedProfile) : null;
  });
  
  const [authPayload, setAuthPayload] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [metricsForm, setMetricsForm] = useState({
    age: '', gender: 'Male', chest_pain: 0, high_blood_pressure: 0,
    irregular_heartbeat: 0, shortness_of_breath: 0, fatigue_weakness: 0,
    dizziness: 0, swelling_edema: 0, neck_jaw_pain: 0, excessive_sweating: 0,
    persistent_cough: 0, nausea_vomiting: 0, chest_discomfort: 0,
    cold_hands_feet: 0, snoring_sleep_apnea: 0, anxiety_doom: 0
  });

  const [diagnosticRun, setDiagnosticRun] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [feedbackState, setFeedbackState] = useState(false);

  const [healthNotebook, setHealthNotebook] = useState({ waterIntake: '', mealsLog: '', symptomsLog: '' });
  const [isNotebookSaved, setIsNotebookSaved] = useState(false);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authPayload.email || !authPayload.password || !authPayload.name) return;

    const registeredUsers = JSON.parse(localStorage.getItem('stroke_shield_global_users') || '[]');
    const userExists = registeredUsers.some(user => user.email === authPayload.email);

    if (userExists) {
      setAuthError('Error: Institutional email already registered!');
      return;
    }

    const newUser = {
      name: authPayload.name,
      email: authPayload.email,
      password: authPayload.password,
      joined: new Date().toLocaleDateString()
    };

    registeredUsers.push(newUser);
    localStorage.setItem('stroke_shield_global_users', JSON.stringify(registeredUsers));
    localStorage.setItem('stroke_shield_active_user', JSON.stringify(newUser));
    setCurrentUser(newUser);
    setActiveTab('predictor');
  };

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authPayload.email || !authPayload.password) return;

    const registeredUsers = JSON.parse(localStorage.getItem('stroke_shield_global_users') || '[]');
    const matchedUser = registeredUsers.find(
      user => user.email === authPayload.email && user.password === authPayload.password
    );

    if (!matchedUser) {
      setAuthError('Authentication Failed: Invalid credentials or account unregistered!');
      return;
    }

    localStorage.setItem('stroke_shield_active_user', JSON.stringify(matchedUser));
    setCurrentUser(matchedUser);
    setActiveTab('predictor');
  };

  const executeLogout = () => {
    localStorage.removeItem('stroke_shield_active_user');
    setCurrentUser(null);
    setDiagnosticRun(null);
    setActiveTab('home');
  };

  const processModelPrediction = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setDiagnosticRun(null);

    try {
      const apiResponse = await fetch('https://stroke-risk-prediction-8wh3.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metricsForm,
          age: parseInt(metricsForm.age, 10)
        })
      });
      const data = await apiResponse.json();
      setDiagnosticRun(data);
      
      if (currentUser) {
        const currentTimestamp = new Date().toLocaleString(); 
        const newRecord = {
          ...data,
          dateTime: currentTimestamp,
          patientAge: metricsForm.age,
          patientGender: metricsForm.gender
        };

        const historyKey = `history_log_${currentUser.email}`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingHistory.unshift(newRecord);
        localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      }
    } catch {
      alert("FastAPI engine disconnected. Running fallback evaluation algorithm matrices.");
      const flagWeightCount = Object.values(metricsForm).slice(2).reduce((a, b) => a + b, 0);
      const calculatedMockPercentage = Math.min(((parseFloat(metricsForm.age) || 30) * 0.4) + (flagWeightCount * 5), 100);
      
      const mockResult = {
        risk_category: calculatedMockPercentage >= 50 ? "High Risk (উচ্চ ঝুঁকি)" : "Low Risk (কম ঝুঁকি)",
        probability: Math.round(calculatedMockPercentage * 100) / 100,
        binary_prediction: calculatedMockPercentage >= 50 ? 1 : 0,
        clinical_recommendations: calculatedMockPercentage >= 50 
          ? ["🚨 Emergency Alert: Immediate specialist clinical neurological review required.", "🥦 Restrict sodium matrix and limit lipids intake parameters daily."] 
          : ["✅ Maintain regular continuous baseline health checking parameters standard.", "🏃 Log moderate physical activity sequences weekly."]
      };
      
      setDiagnosticRun(mockResult);

      if (currentUser) {
        const currentTimestamp = new Date().toLocaleString(); 
        const newRecord = {
          ...mockResult,
          dateTime: currentTimestamp,
          patientAge: metricsForm.age,
          patientGender: metricsForm.gender
        };
        const historyKey = `history_log_${currentUser.email}`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingHistory.unshift(newRecord);
        localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleNotebookSubmit = (e) => {
    e.preventDefault();
    if (currentUser) {
      const currentTimestamp = new Date().toLocaleString();
      const newNoteEntry = {
        ...healthNotebook,
        dateTime: currentTimestamp
      };

      const notebookKey = `notebook_stack_${currentUser.email}`;
      const existingNotes = JSON.parse(localStorage.getItem(notebookKey) || '[]');
      existingNotes.unshift(newNoteEntry);
      localStorage.setItem(notebookKey, JSON.stringify(existingNotes));

      setIsNotebookSaved(true);
      setHealthNotebook({ waterIntake: '', mealsLog: '', symptomsLog: '' });
      setTimeout(() => setIsNotebookSaved(false), 3000);
    }
  };

  const articleCatalog = [
    { 
      title: "Understanding Silent Stroke Risk Biomarkers", 
      img: "/images/stroke-article.jpg", 
      summary: "How subtle clinical indicators can provide early warnings for potential acute ischemic events.", 
      fullContent: "Silent strokes are structural changes in brain tissue that occur without immediate apparent symptoms, often uncovered during neuroimaging. Analyzing high-dimension telemetry arrays and data fields reveals clear links to continuous arterial damage. Early tracking of persistent symptoms remains an important indicator for systematic clinical health protection pipelines.",
      time: "5 min read" 
    },
    { 
      title: "The Correlation Between Hypertension & Atrial Health", 
      img: "/images/stroke-prevention.jpg", 
      summary: "Analyzing how elevated systematic arterial pressure damages critical tissue networks over time.", 
      fullContent: "Systematic pressure load over long durations strains muscle layers within cardiovascular loops. Clinical studies show that unmanaged hypertension increases the likelihood of atrial fibrillation. This condition contributes to uneven blood flow patterns, emphasizing the need for regular monitoring to prevent potential long-term complications.",
      time: "8 min read" 
    },
    { 
      title: "Dietary Adjustments for Ischemic Stroke Prevention", 
      img: "/images/healthy-diet.jpg", 
      summary: "Scientific evidence validating high fiber and omega-3 cardiovascular cell repair protocols.", 
      fullContent: "Nutritional intake directly affects vascular health and the condition of arterial linings. Clinical models indicate that low-sodium, high-potassium eating plans significantly reduce plaque accumulation risks. Incorporating plant-based fibers and omega-3 elements supports blood pressure management and helps maintain functional vascular health.",
      time: "6 min read" 
    }
  ];

  const userHistoryStack = currentUser ? JSON.parse(localStorage.getItem(`history_log_${currentUser.email}`) || '[]') : [];
  const latestCachedUserLog = userHistoryStack.length > 0 ? userHistoryStack[0] : null;
  const userNotebookStack = currentUser ? JSON.parse(localStorage.getItem(`notebook_stack_${currentUser.email}`) || '[]') : [];

  return (
    <div className="app-wrapper">
      <header className="app-navbar">
        <div className="brand-logo" onClick={() => setActiveTab('home')}>🛡️ StrokeShield</div>
        <nav className="nav-links">
          <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'active' : ''}>Home Workspace</button>
          <button onClick={() => setActiveTab('articles')} className={activeTab === 'articles' ? 'active' : ''}>Health Articles</button>
          {currentUser && <button onClick={() => setActiveTab('predictor')} className={activeTab === 'predictor' ? 'active' : ''}>Diagnostic Core</button>}
          {currentUser && <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>User Profile & History</button>}
        </nav>
        <div className="nav-auth">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Operator: {currentUser.name}</span>
              <button className="signout-btn" onClick={executeLogout}>Sign Out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="cta-nav-btn" onClick={() => { setAuthError(''); setActiveTab('login'); }}>Sign In</button>
              <button className="cta-nav-btn" style={{ background: 'var(--dark-forest)', color: 'white' }} onClick={() => { setAuthError(''); setActiveTab('register'); }}>Register</button>
            </div>
          )}
        </div>
      </header>

      <main className="content-container">
        {activeTab === 'home' && (
          <>
            <section className="hero-pane">
              <h1>StrokeShield<br />Analytics Platform</h1>
              <p>An automated health management system designed to predict stroke risk indicators using clinical data vectors. Powered by custom trained machine learning algorithm matrices.</p>
              <button className="hero-cta" onClick={() => setActiveTab(currentUser ? 'predictor' : 'login')}>Initialize System Assessment</button>
            </section>

            <section className="premium-dark-block">
              <div className="feature-vibe-grid">
                <div className="vibe-icon-card">
                  <div style={{ fontSize: '2rem' }}>🌐</div>
                  <h4>Risk Evaluation</h4>
                  <p>Categorized calculations returning real-time risk parameters based on clinical data.</p>
                </div>
                <div className="vibe-icon-card">
                  <div style={{ fontSize: '2rem' }}>🥦</div>
                  <h4>Lifestyle Guidelines</h4>
                  <p>Provides target guidelines for food regimens, exercise, and sleep based on results.</p>
                </div>
                <div className="vibe-icon-card">
                  <div style={{ fontSize: '2rem' }}>🛡️</div>
                  <h4>Clinical Features</h4>
                  <p>Evaluates complex vital maps across 17 distinct observation symptom variables.</p>
                </div>
                <div className="vibe-icon-card">
                  <div style={{ fontSize: '2rem' }}>👤</div>
                  <h4>Profile Logs</h4>
                  <p>Maintain historical logs and medical record metrics seamlessly inside browser memory.</p>
                </div>
              </div>
            </section>

            <section className="nature-cards-grid">
              <div className="nature-box sage">
                <h3>Early Identification</h3>
                <p>Preventative analytical models structured to check critical healthcare indications accurately.</p>
              </div>
              
              <div className="nature-box dark">
                <h3>Your Lifestyle Node</h3>
                {latestCachedUserLog ? (
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Current Status:</strong> {latestCachedUserLog.risk_category}</p>
                    <p style={{ fontSize: '13px', color: '#c9ded3', margin: '0 0 5px 0' }}>Last Score: {latestCachedUserLog.probability}%</p>
                    <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 10px 0' }}>Logged: {latestCachedUserLog.dateTime}</p>
                    <button className="hero-cta" style={{ padding: '0.4rem 1rem', fontSize: '12px' }} onClick={() => setActiveTab('predictor')}>Update Diagnosis</button>
                  </div>
                ) : (
                  <p>No processed data metrics found. Please execute the AI pipeline to unlock personalized advice.</p>
                )}
              </div>

              <div className="nature-box brown">
                <h3>Latest Health Advice</h3>
                {latestCachedUserLog ? (
                  <ul style={{ fontSize: '12px', paddingLeft: '15px', margin: 0, textAlign: 'left', color: 'white' }}>
                    {latestCachedUserLog.clinical_recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Maintain consistent blood glucose levels and track regular cardiovascular body indexes daily.</p>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'login' && (
          <section style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="nature-box sand" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
              <h2 style={{ color: 'var(--chocolate)', marginTop: 0 }}>System Sign In</h2>
              {authError && <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', margin: '0 0 15px 0' }}>{authError}</p>}
              <form onSubmit={handleSignInSubmit}>
                <div className="input-field-group">
                  <label>Institutional Email</label>
                  <input type="email" placeholder="clinician@strokeshield.org" required onChange={(e) => setAuthPayload({...authPayload, email: e.target.value})} />
                </div>
                <div className="input-field-group">
                  <label>Security Keyphrase</label>
                  <input type="password" placeholder="••••••••" required onChange={(e) => setAuthPayload({...authPayload, password: e.target.value})} />
                </div>
                <button type="submit" className="submit-engine-btn" style={{ marginTop: '1rem' }}>Validate Security Session</button>
              </form>
              <p style={{ fontSize: '13px', textAlign: 'center', marginTop: '15px', color: 'var(--mid-moss)', cursor: 'pointer' }} onClick={() => { setAuthError(''); setActiveTab('register'); }}>
                New operator node? Register profile credentials here.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'register' && (
          <section style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="nature-box sand" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
              <h2 style={{ color: 'var(--chocolate)', marginTop: 0 }}>Register System Identity</h2>
              {authError && <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', margin: '0 0 15px 0' }}>{authError}</p>}
              <form onSubmit={handleRegisterSubmit}>
                <div className="input-field-group">
                  <label>Full Account Name</label>
                  <input type="text" placeholder="Dr. Sarah Jenkins" required onChange={(e) => setAuthPayload({...authPayload, name: e.target.value})} />
                </div>
                <div className="input-field-group">
                  <label>Institutional Email</label>
                  <input type="email" placeholder="sarah@strokeshield.org" required onChange={(e) => setAuthPayload({...authPayload, email: e.target.value})} />
                </div>
                <div className="input-field-group">
                  <label>Establish Account Passkey</label>
                  <input type="password" placeholder="••••••••" required onChange={(e) => setAuthPayload({...authPayload, password: e.target.value})} />
                </div>
                <button type="submit" className="submit-engine-btn" style={{ marginTop: '1rem' }}>Commit Registration Profile</button>
              </form>
              <p style={{ fontSize: '13px', textAlign: 'center', marginTop: '15px', color: 'var(--mid-moss)', cursor: 'pointer' }} onClick={() => { setAuthError(''); setActiveTab('login'); }}>
                Existing profile verified? Initialize gateway login credentials.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'predictor' && (
          <section className="glass-panel-grid">
            <div className="nature-box sand" style={{ height: 'auto' }}>
              <h2 style={{ color: 'var(--chocolate)', marginTop: 0 }}>Patient Diagnostics Matrix</h2>
              <form onSubmit={processModelPrediction}>
                <div className="base-demographics-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-field-group">
                    <label>Chronological Age (Years)</label>
                    <input type="number" required min="1" max="120" value={metricsForm.age} onChange={(e) => setMetricsForm({...metricsForm, age: e.target.value})} />
                  </div>
                  <div className="input-field-group">
                    <label>Biological Gender Mapping</label>
                    <select value={metricsForm.gender} onChange={(e) => setMetricsForm({...metricsForm, gender: e.target.value})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <h3 style={{ fontSize: '14px', margin: '20px 0 10px 0', color: 'var(--dark-forest)' }}>Symptom Matrix Checklist</h3>
                <div className="symptom-toggle-flex">
                  {Object.keys(metricsForm).slice(2).map((featureKey) => (
                    <label key={featureKey} className={`checkbox-tile ${metricsForm[featureKey] === 1 ? 'active' : ''}`}>
                      <input type="checkbox" checked={metricsForm[featureKey] === 1} style={{ display: 'none' }} onChange={(e) => setMetricsForm({...metricsForm, [featureKey]: e.target.checked ? 1 : 0})} />
                      <span>{featureKey.replace(/_/g, ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>

                <button type="submit" disabled={processing} className="submit-engine-btn">
                  {processing ? 'Computing Engine Analytics...' : 'Compute Engine Analytics'}
                </button>
              </form>
            </div>

            <div className="nature-box dark" style={{ height: 'fit-content' }}>
              <h2 style={{ color: 'white', marginTop: 0 }}>Calculation Output</h2>
              {diagnosticRun ? (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{ fontSize: '4.5rem', fontWeight: '900', color: 'white', margin: '15px 0', textAlign: 'center' }}>{diagnosticRun.probability}%</div>
                  <h3 style={{ color: diagnosticRun.binary_prediction === 1 ? '#fecdd3' : '#bbf7d0', fontSize: '1.4rem', textAlign: 'center' }}>{diagnosticRun.risk_category}</h3>
                  
                  <div style={{ textAlign: 'left', marginTop: '2.5rem', background: 'rgba(255,255,255,0.08)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ color: 'white', marginTop: 0, marginBottom: '10px' }}>Target Interventions & Health Suggestions:</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#c9ded3', fontSize: '14px', lineHeight: '1.6' }}>
                      {diagnosticRun.clinical_recommendations.map((recommendation, i) => (
                        <li key={i} style={{ marginBottom: '6px' }}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p style={{ opacity: 0.7, lineHeight: '1.6', textAlign: 'center', paddingTop: '3rem' }}>Please enter diagnostic variables and evaluate the classification logic arrays.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'articles' && (
          <section>
            <h2 style={{ color: 'var(--dark-forest)', marginBottom: '2rem', fontSize: '2rem', fontWeight: '800' }}>Research Literature & Informational Feed</h2>
            <div className="nature-cards-grid">
              {articleCatalog.map((article, idx) => (
                <article key={idx} className="premium-blog-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <img src={article.img} alt={article.title} className="blog-banner" />
                  <div className="blog-body" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--earth-clay)' }}>{article.time}</span>
                      <h3 style={{ margin: '8px 0 12px 0', fontSize: '1.2rem', color: 'var(--dark-forest)', lineHeight: '1.3' }}>{article.title}</h3>
                      <p style={{ fontSize: '14px', color: 'var(--mid-moss)', margin: '0 0 15px 0', lineHeight: '1.5' }}>{article.summary}</p>
                    </div>
                    <button className="submit-engine-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '13px', borderRadius: '20px' }} onClick={() => setSelectedArticle(article)}>
                      Read Full Article
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'profile' && currentUser && (
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="nature-box sand" style={{ height: 'auto', minHeight: 'fit-content' }}>
                <h2>Operator Profile</h2>
                <div style={{ lineHeight: '2', color: 'var(--dark-forest)', fontSize: '15px' }}>
                  <p><strong>Clinician User:</strong> {currentUser.name}</p>
                  <p><strong>System Email Node:</strong> {currentUser.email}</p>
                  <p><strong>Registry Stamp:</strong> {currentUser.joined}</p>
                </div>
              </div>

              <div className="nature-box sand" style={{ height: 'auto' }}>
                <h2>Daily Health Notebook</h2>
                <form onSubmit={handleNotebookSubmit}>
                  <div className="input-field-group">
                    <label>Daily Meals Log</label>
                    <input type="text" placeholder="e.g. Rice, Fish, Vegetables" required value={healthNotebook.mealsLog} onChange={(e) => setHealthNotebook({...healthNotebook, mealsLog: e.target.value})} />
                  </div>
                  <div className="input-field-group">
                    <label>Water Intake Log (Liters)</label>
                    <input type="number" step="0.1" placeholder="e.g. 3.0" required value={healthNotebook.waterIntake} onChange={(e) => setHealthNotebook({...healthNotebook, waterIntake: e.target.value})} />
                  </div>
                  <div className="input-field-group">
                    <label>Symptoms Observation</label>
                    <input type="text" placeholder="e.g. Felt dizzy around afternoon" required value={healthNotebook.symptomsLog} onChange={(e) => setHealthNotebook({...healthNotebook, symptomsLog: e.target.value})} />
                  </div>
                  <button type="submit" className="submit-engine-btn">Save Notebook Entry</button>
                  {isNotebookSaved && <p style={{color: '#166534', fontSize: '12px', marginTop: '10px', fontWeight: 'bold'}}>✓ Note updated into history timeline.</p>}
                </form>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="nature-box dark" style={{ height: 'auto', maxHeight: '400px', overflowY: 'auto', justifyContent: 'flex-start' }}>
                <h2 style={{color: 'white', marginBottom: '1.5rem'}}>Chronological Analytics Logs ({userHistoryStack.length})</h2>
                {userHistoryStack.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px', width: '100%'}}>
                    {userHistoryStack.map((log, index) => (
                      <div key={index} style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                          <span style={{fontWeight: 'bold', color: log.binary_prediction === 1 ? '#fecdd3' : '#bbf7d0'}}>{log.risk_category}</span>
                          <span style={{fontSize: '12px', opacity: 0.7}}>{log.dateTime}</span>
                        </div>
                        <p style={{margin: '0', fontSize: '14px'}}>Probability Index: <strong>{log.probability}%</strong> | Patient: Age {log.patientAge}, {log.patientGender}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{color: '#c5ded0', fontStyle: 'italic'}}>No past risk records found on this profile node.</p>
                )}
              </div>

              <div className="nature-box sand" style={{ height: 'auto', maxHeight: '400px', overflowY: 'auto', justifyContent: 'flex-start', color: 'var(--chocolate)' }}>
                <h2 style={{marginBottom: '1.5rem'}}>Notebook Updates Timeline ({userNotebookStack.length})</h2>
                {userNotebookStack.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px', width: '100%'}}>
                    {userNotebookStack.map((note, index) => (
                      <div key={index} style={{ background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '12px', textAlign: 'left', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px'}}>
                          <span style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--mid-moss)'}}>📅 {note.dateTime}</span>
                        </div>
                        <p style={{margin: '4px 0', fontSize: '13px'}}>🍴 <strong>Meals:</strong> {note.mealsLog}</p>
                        <p style={{margin: '4px 0', fontSize: '13px'}}>💧 <strong>Water Intake:</strong> {note.waterIntake} L</p>
                        <p style={{margin: '4px 0', fontSize: '13px'}}>🩺 <strong>Symptoms Observed:</strong> {note.symptomsLog}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{color: 'var(--mid-moss)', fontStyle: 'italic'}}>No health notes updated yet.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedArticle && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div className="nature-box sand" style={{ maxWidth: '600px', width: '100%', height: 'auto', maxHeight: '85vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: 'var(--chocolate)', margin: '0 0 10px 0' }}>{selectedArticle.title}</h2>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--earth-clay)' }}>{selectedArticle.time}</span>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--dark-forest)', margin: '20px 0' }}>{selectedArticle.fullContent}</p>
            <button className="submit-engine-btn" onClick={() => setSelectedArticle(null)}>Close Article</button>
          </div>
        </div>
      )}

      <footer className="premium-footer">
        <div className="footer-block-grid">
          <div>
            <h4>🛡️ StrokeShield Project Architecture</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#c5ded0' }}>Advanced machine learning system designed to check patient stroke risks using clinical vectors and predictive analytics models.</p>
          </div>
          <div className="footer-links">
            <h4>Workspace Links</h4>
            <span onClick={() => setActiveTab('home')}>Overview Landing</span>
            <span onClick={() => setActiveTab('articles')}>Literature Index</span>
            <span onClick={() => { if(currentUser) { setActiveTab('predictor') } else { setActiveTab('login') } }}>Live Diagnostic Engine</span>
          </div>
          <div className="footer-feedback">
            <h4>System Logs Feedback</h4>
            {feedbackState ? (
              <p style={{ color: 'white', fontSize: '14px' }}>Log feedback submitted.</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setFeedbackState(true); }}>
                <textarea placeholder="Report input structural errors or calibration bugs here..." required></textarea>
                <button type="submit">Submit Platform Log</button>
              </form>
            )}
          </div>
        </div>
        <div className="footer-copyright-row">
          &copy; 2026 StrokeShield Health Management Network Core. All features and datasets scaled.
        </div>
      </footer>
    </div>
  );
}
