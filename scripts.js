const app = {};

// DATABASE
app.turni = JSON.parse(localStorage.getItem('turniSoloApprovazioni')) || [];
app.currentUser = null;

// UTILS
app.utils = {
    calcolaOre: (i, f) => { 
        const [hi, mi] = i.split(':').map(Number), [hf, mf] = f.split(':').map(Number);
        return (hf - hi + (mf - mi) / 60).toFixed(2);
    },
    classeNote: n => n?.toLowerCase().includes('ritardo') ? 'ritardo' : 
                     n?.toLowerCase().includes('uscita') || n?.toLowerCase().includes('anticipata') ? 'uscita-anticipata' : '',
    salva: () => localStorage.setItem('turniSoloApprovazioni', JSON.stringify(app.turni))
};

// AUTH
app.auth = {
    loginResponsabile: () => {
        if (document.getElementById('responsabilePassword').value === 'admin123') {
            app.currentUser = { type: 'responsabile' };
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('responsabileContent').classList.add('active');
            app.agg.approvazioni(); app.agg.riepilogoResp();
        }
    },
    loginAllenatore: () => {
        if (document.getElementById('allenatorePassword').value === '1234') {
            app.currentUser = { type: 'allenatore', name: document.getElementById('allenatoreSelect').value };
            document.getElementById('allenatoreNomeBadge').textContent = app.currentUser.name;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('allenatoreContent').classList.add('active');
            app.agg.turniAllenatore('tutti');
        }
    },
    logout: () => {
        app.currentUser = null;
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('responsabileContent').classList.remove('active');
        document.getElementById('allenatoreContent').classList.remove('active');
    }
};

// TURNI
app.turniManager = {
    inserisci: () => {
        const ore = app.utils.calcolaOre(
            document.getElementById('oraInizioAllenatore').value,
            document.getElementById('oraFineAllenatore').value
        );
        app.turni.push({
            id: Date.now(),
            allenatore: app.currentUser.name,
            giorno: document.getElementById('giornoAllenatore').value,
            oraInizio: document.getElementById('oraInizioAllenatore').value,
            oraFine: document.getElementById('oraFineAllenatore').value,
            oreTotali: ore,
            compenso: (ore * 25).toFixed(2),
            note: document.getElementById('noteAllenatore').value,
            stato: 'in_attesa',
            tariffa: 25
        });
        app.utils.salva();
        alert('✅ Inviato!');
        document.getElementById('oraInizioAllenatore').value = '09:00';
        document.getElementById('oraFineAllenatore').value = '17:00';
        document.getElementById('noteAllenatore').value = '';
        app.agg.turniAllenatore('tutti');
    },
    approva: id => { app.turni.find(t => t.id === id).stato = 'approvato'; app.utils.salva(); app.agg.approvazioni(); app.agg.riepilogoResp(); app.agg.turniAllenatore('tutti'); },
    respingi: id => { app.turni.find(t => t.id === id).stato = 'respinto'; app.utils.salva(); app.agg.approvazioni(); app.agg.turniAllenatore('tutti'); },
    elimina: id => { if (confirm('Eliminare?')) { app.turni = app.turni.filter(t => t.id !== id); app.utils.salva(); app.agg.turniAllenatore('tutti'); } }
};

// AGGIORNAMENTI
app.agg = {
    approvazioni: () => {
        document.getElementById('approvazioniBody').innerHTML = app.turni.filter(t => t.stato === 'in_attesa').map(t => 
            `<tr class="${app.utils.classeNote(t.note)}"><td><strong>${t.allenatore}</strong></td><td>${t.giorno}</td><td>${t.oreTotali}h</td><td>${t.note || '-'}</td>
            <td><button class="action-btn" style="background:#38a169;color:white;" onclick="app.turniManager.approva(${t.id})">✅</button>
            <button class="action-btn" style="background:#e53e3e;color:white;" onclick="app.turniManager.respingi(${t.id})">❌</button></td></tr>`
        ).join('');
        document.getElementById('approvatiBody').innerHTML = app.turni.filter(t => t.stato === 'approvato').map(t => 
            `<tr><td>${t.allenatore}</td><td>${t.giorno}</td><td>${t.oreTotali}h</td><td>€${t.compenso}</td><td>${t.note || '-'}</td></tr>`
        ).join('');
    },
    turniAllenatore: f => {
        let tp = app.turni.filter(t => t.allenatore === app.currentUser.name);
        if (f === 'approvati') tp = tp.filter(t => t.stato === 'approvato');
        if (f === 'attesa') tp = tp.filter(t => t.stato === 'in_attesa');
        document.getElementById('allenatoreTurniBody').innerHTML = tp.map(t => 
            `<tr class="${app.utils.classeNote(t.note)}"><td>${t.giorno}</td><td>${t.oreTotali}h</td>
            <td><span class="status-badge ${t.stato === 'approvato' ? 'status-approvato' : 'status-in-attesa'}">${t.stato === 'approvato' ? '✅' : '⏳'}</span></td>
            <td>€${t.compenso}</td><td>${t.note || '-'}</td>
            <td>${t.stato === 'in_attesa' ? `<button class="action-btn" style="background:#e53e3e;color:white;" onclick="app.turniManager.elimina(${t.id})">🗑️</button>` : '-'}</td></tr>`
        ).join('');
        const appr = app.turni.filter(t => t.allenatore === app.currentUser.name && t.stato === 'approvato');
        const att = app.turni.filter(t => t.allenatore === app.currentUser.name && t.stato === 'in_attesa');
        document.getElementById('mieOreTotali').textContent = appr.reduce((s,t) => s + parseFloat(t.oreTotali), 0).toFixed(2);
        document.getElementById('mioCompensoTotale').textContent = `€${appr.reduce((s,t) => s + parseFloat(t.compenso), 0).toFixed(2)}`;
        document.getElementById('mieOreInAttesa').textContent = att.reduce((s,t) => s + parseFloat(t.oreTotali), 0).toFixed(2);
    },
    riepilogoResp: () => {
        const appr = app.turni.filter(t => t.stato === 'approvato'), att = app.turni.filter(t => t.stato === 'in_attesa');
        document.getElementById('totaleOreResp').textContent = appr.reduce((s,t) => s + parseFloat(t.oreTotali), 0).toFixed(2);
        document.getElementById('totaleCompensoResp').textContent = `€${appr.reduce((s,t) => s + parseFloat(t.compenso), 0).toFixed(2)}`;
        document.getElementById('turniInAttesa').textContent = att.length;
    }
};

// UI
app.ui = {
    setUserType: t => {
        document.querySelectorAll('.user-type-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('responsabileLogin').style.display = t === 'responsabile' ? 'block' : 'none';
        document.getElementById('allenatoreLogin').style.display = t === 'allenatore' ? 'block' : 'none';
    },
    cambiaTabResp: t => {
        document.querySelectorAll('#responsabileContent .tab').forEach(tab => tab.classList.remove('active'));
        if (t === 'da-approvare') {
            document.querySelector('#responsabileContent .tab').classList.add('active');
            document.getElementById('tabDaApprovare').style.display = 'block';
            document.getElementById('tabApprovatiResp').style.display = 'none';
        } else {
            document.querySelectorAll('#responsabileContent .tab')[1].classList.add('active');
            document.getElementById('tabDaApprovare').style.display = 'none';
            document.getElementById('tabApprovatiResp').style.display = 'block';
        }
    },
    cambiaTabAllenatore: t => {
        document.querySelectorAll('#allenatoreContent .tab').forEach(tab => tab.classList.remove('active'));
        if (t === 'tutti') document.querySelector('#allenatoreContent .tab').classList.add('active');
        else if (t === 'approvati') document.querySelectorAll('#allenatoreContent .tab')[1].classList.add('active');
        else document.querySelectorAll('#allenatoreContent .tab')[2].classList.add('active');
        app.agg.turniAllenatore(t);
    }
};

window.app = app;