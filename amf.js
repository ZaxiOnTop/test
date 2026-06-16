/* ============================================================
   AllMyFunds — état de session partagé (prototype démo)
   Deux parcours :
     • Connexion  -> utilisateur premium (abonnement max, comptes reliés, onboarding fait)
     • Inscription -> nouvel utilisateur gratuit (aucun compte, onboarding à faire)
   Tout est stocké dans localStorage. Aucune dépendance externe.
   ============================================================ */
(function () {
  var SUB  = 'amf_subscription_v1';        // { plan:'gratuit'|'premium'|'expert', cycle }
  var SES  = 'amf_session_v1';             // { mode:'premium'|'free', onboarded:bool }
  var ACC  = 'amf_connected_accounts_v1';  // [ comptes ]
  var PROF = 'amf_investor_profile_v1';    // réponses profil investisseur

  function readJSON(k, d) {
    try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : d; }
    catch (e) { return d; }
  }
  function writeJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var LOCK_SM = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/>'
    + '<path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  var _lockCss = false;
  function ensureLockCss() {
    if (_lockCss) return; _lockCss = true;
    var css = ''
      + '.amf-locked > :not(.amf-lock-ov){filter:blur(4px);pointer-events:none;user-select:none}'
      + '.amf-locked > .card-head{filter:none;-webkit-filter:none;pointer-events:auto}'
      + '.amf-lock-ov{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;'
      + 'padding:14px;background:rgba(243,247,252,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);border-radius:inherit}'
      + '.amf-lock-in{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;max-width:280px}'
      + '.amf-lock-ic{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;'
      + 'background:linear-gradient(150deg,#0d3a9e,#004AAD 60%,#0a52bd)}'
      + '.amf-lock-in b{font-size:13.5px;font-weight:600;color:#013a87}'
      + '.amf-lock-cta{display:inline-block;background:#004AAD;color:#fff;font-weight:600;font-size:12.5px;'
      + 'padding:8px 16px;border-radius:10px;box-shadow:0 12px 22px -12px rgba(0,74,173,.7)}'
      + '.amf-lock-cta:hover{background:#013a87}'
      + '.amf-lock-ov.compact .amf-lock-ic{width:32px;height:32px}'
      + '.amf-lock-ov.compact .amf-lock-in b{font-size:12.5px}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }

  /* Comptes pré-reliés pour la démo premium (identiques au seed de comptes-connectes) */
  function seedAccounts() {
    return [
      { id:'a1', bankId:'bnp',    type:'Compte courant', mask:'4821', balance:3250.40, status:'ok',   sync:"à l'instant" },
      { id:'a2', bankId:'bourso', type:'Livret A',       mask:'9032', balance:12800,   status:'ok',   sync:'il y a 2 h' },
      { id:'a3', bankId:'ca',     type:'Compte joint',   mask:'1177', balance:1940.15, status:'warn', sync:'il y a 3 j' }
    ];
  }

  /* Profil investisseur par défaut pour la démo premium (même schéma que profil-investisseur.html) */
  function seedProfile() {
    return {
      risk:'equilibre', horizon:'moyen', exp:'intermediaire',
      goals:['retraite','fructifier'], reaction:'hold',
      esg:true, europe:false, crypto:true, exclude:false, tone:'pedagogique'
    };
  }

  var AMF = {
    /* --- lecture --- */
    plan:        function () { var p = readJSON(SUB, null); return (p && p.plan) || 'gratuit'; },
    rank:        function () { return ({ gratuit:0, premium:1, expert:2 })[AMF.plan()] || 0; },
    isPremium:   function () { return AMF.plan() !== 'gratuit'; },
    isFree:      function () { return !AMF.isPremium(); },
    /* l'utilisateur a-t-il au moins le palier demandé ? ('premium' | 'expert') */
    meets:       function (tier) { return AMF.rank() >= (tier === 'expert' ? 2 : 1); },
    session:     function () { return readJSON(SES, {}); },
    onboarded:   function () { return !!AMF.session().onboarded; },
    hasAccounts: function () { var a = readJSON(ACC, null); return Array.isArray(a) && a.length > 0; },
    planLabel:   function () { return ({ premium:'Premium', expert:'Expert' })[AMF.plan()] || ''; },

    /* --- parcours 1 : connexion (utilisateur premium existant) --- */
    loginPremium: function () {
      writeJSON(SUB, { plan:'expert', cycle:'mois' });
      writeJSON(SES, { mode:'premium', onboarded:true });
      writeJSON(ACC, seedAccounts());
      if (!readJSON(PROF, null)) writeJSON(PROF, seedProfile());
    },

    /* --- parcours 2 : inscription (nouvel utilisateur gratuit) --- */
    signupFree: function () {
      writeJSON(SUB, { plan:'gratuit', cycle:'mois' });
      writeJSON(SES, { mode:'free', onboarded:false });
      writeJSON(ACC, []);                 // dashboard & comptes vides
      try { localStorage.removeItem(PROF); } catch (e) {}
    },

    /* fin de l'onboarding -> on mémorise les réponses et on marque l'étape faite */
    completeOnboarding: function (profile) {
      if (profile) writeJSON(PROF, profile);
      var s = AMF.session(); s.onboarded = true; writeJSON(SES, s);
    },

    /* déconnexion : on efface la session (les autres données restent pour la démo) */
    logout: function () {
      try { localStorage.removeItem(SES); localStorage.removeItem(SUB); } catch (e) {}
    },

    /* change le plan (utilisé par la popup d'abonnement de la démo) */
    setPlan: function (plan) {
      writeJSON(SUB, { plan: plan, cycle: 'mois' });
    },

    /* ouvre la popup d'abonnement */
    openSubscribe: function () { openSubscribeModal(); },

    /* Verrouille un élément précis (overlay + flou) pour un parcours gratuit.
       opts : { label, cta (bool), ctaText, compact (bool) } */
    lock: function (el, opts) {
      if (!el || el.querySelector(':scope > .amf-lock-ov')) return;
      opts = opts || {};
      ensureLockCss();
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.classList.add('amf-locked');
      var ov = document.createElement('div');
      ov.className = 'amf-lock-ov' + (opts.compact ? ' compact' : '');
      ov.innerHTML =
        '<div class="amf-lock-in">' +
          '<span class="amf-lock-ic">' + LOCK_SM + '</span>' +
          '<b>' + (opts.label || 'Réservé au Premium') + '</b>' +
          (opts.cta === false ? '' :
            '<a class="amf-lock-cta" href="abonnement.html?upgrade=1">' + (opts.ctaText || 'Débloquer') + '</a>') +
        '</div>';
      el.appendChild(ov);
    },

    seedAccounts: seedAccounts
  };

  window.AMF = AMF;

  /* ---------- effets automatiques au chargement de chaque page ---------- */
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    /* 1) widget « Améliorez votre abonnement » -> état actif si premium */
    if (AMF.isPremium()) {
      var L = AMF.planLabel();
      var u = document.querySelector('.upgrade');
      if (u) {
        var h4 = u.querySelector('h4'), pa = u.querySelector('p'), b = u.querySelector('.up-btn');
        if (h4) h4.textContent = 'Abonnement ' + L + ' actif';
        if (pa) pa.textContent = 'Vous profitez de tous les avantages ' + L + '.';
        if (b)  { b.textContent = 'Gérer mon abonnement'; b.setAttribute('href', 'abonnement.html'); }
      }
    }

    /* 2) nouvel utilisateur gratuit sans compte relié : pages de données vides
          (<body data-empty-when-no-accounts="1">) */
    var needsAccounts = document.body && document.body.getAttribute('data-empty-when-no-accounts') === '1';
    if (needsAccounts && AMF.isFree() && !AMF.hasAccounts()) {
      injectEmptyState();
    } else {
      /* 3) verrou premium pleine page : <body data-premium="premium|expert|1"> */
      var need = document.body && document.body.getAttribute('data-premium');
      if (need) {
        var tier = need === 'expert' ? 'expert' : 'premium';
        if (!AMF.meets(tier)) injectPremiumGate(tier === 'expert' ? 'Expert' : 'Premium');
      }
    }

    /* 4) tout bouton « Débloquer » ouvre la popup d'abonnement (au lieu de quitter la page) */
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.amf-lock-cta, .amf-gate .b1, a.unlock, [data-amf-subscribe]');
      if (t) { e.preventDefault(); openSubscribeModal(); }
    });

    /* 5) déconnexion : on efface la session avant de revenir à l'accueil */
    var out = document.querySelector('a.out');
    if (out) out.addEventListener('click', function () { AMF.logout(); });
  });

  /* Overlay « Fonctionnalité Premium » posé au-dessus du contenu principal */
  function injectPremiumGate(label) {
    label = label || 'Premium';
    var host = document.querySelector('.main') || document.body;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var css = ''
      + '.amf-gate{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;'
      + 'padding:24px;background:rgba(243,247,252,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}'
      + '.amf-gate-card{max-width:420px;width:100%;background:#fff;border:1px solid #e7ebf2;border-radius:20px;'
      + 'padding:30px 28px;text-align:center;box-shadow:0 28px 60px -28px rgba(0,40,120,.35)}'
      + '.amf-gate-ic{width:60px;height:60px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;'
      + 'justify-content:center;background:linear-gradient(150deg,#0d3a9e,#004AAD 60%,#0a52bd)}'
      + '.amf-gate h2{font-size:20px;font-weight:700;color:#013a87;margin-bottom:8px;letter-spacing:-.02em}'
      + '.amf-gate p{font-size:14px;color:#5a6475;line-height:1.5;margin-bottom:20px}'
      + '.amf-gate .b1{display:block;width:100%;padding:13px;border-radius:12px;background:#004AAD;color:#fff;'
      + 'font-weight:600;font-size:15px;box-shadow:0 14px 26px -14px rgba(0,74,173,.7)}'
      + '.amf-gate .b1:hover{background:#013a87}'
      + '.amf-gate .b2{display:inline-block;margin-top:12px;color:#5a6475;font-weight:600;font-size:13.5px}'
      + '.amf-gate .b2:hover{color:#004AAD}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var lock = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/>'
      + '<path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

    var gate = document.createElement('div');
    gate.className = 'amf-gate';
    gate.innerHTML =
      '<div class="amf-gate-card">' +
        '<div class="amf-gate-ic">' + lock + '</div>' +
        '<h2>Fonctionnalité ' + label + '</h2>' +
        '<p>Cet outil est inclus dans l\'offre ' + label + '. Passez à l\'abonnement ' + label + ' pour débloquer l\'ensemble des analyses et des outils d\'optimisation.</p>' +
        '<a class="b1" href="abonnement.html?upgrade=1">Voir les offres ' + label + '</a>' +
        '<a class="b2" href="dashboard.html">Retour au tableau de bord</a>' +
      '</div>';
    host.appendChild(gate);
  }

  /* État vide générique : masque le contenu de données et invite à connecter un compte */
  function injectEmptyState() {
    var main = document.querySelector('.main'); if (!main) return;
    if (main.querySelector('.amf-empty')) return;
    var content = main.querySelector('.content');
    if (content) content.style.display = 'none';

    var css = ''
      + '.amf-empty{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:24px clamp(14px,2.2vw,32px) 30px}'
      + '.amf-empty-card{max-width:560px;width:100%;text-align:center;background:#fff;border:1px solid #eef1f6;'
      + 'border-radius:24px;padding:clamp(30px,5vh,52px) clamp(24px,4vw,48px);box-shadow:0 30px 70px -40px rgba(0,40,120,.4)}'
      + '.amf-empty-ic{width:84px;height:84px;border-radius:24px;margin:0 auto 22px;display:flex;align-items:center;justify-content:center;'
      + 'background:linear-gradient(150deg,#0d3a9e,#004AAD 60%,#0a52bd);box-shadow:0 18px 34px -16px rgba(0,74,173,.7)}'
      + '.amf-empty-card h2{font-size:clamp(20px,2vw,26px);font-weight:700;letter-spacing:-.4px;margin-bottom:10px;color:#0f1622}'
      + '.amf-empty-card p{font-size:clamp(13.5px,1vw,15px);color:#6b7280;line-height:1.55;max-width:420px;margin:0 auto 26px}'
      + '.amf-empty-cta{display:inline-flex;align-items:center;gap:10px;background:#004AAD;color:#fff;font-weight:600;'
      + 'font-size:clamp(14px,1vw,15.5px);padding:14px 28px;border-radius:14px;box-shadow:0 16px 30px -14px rgba(0,74,173,.75)}'
      + '.amf-empty-cta:hover{background:#013a87}'
      + '.amf-empty-hint{margin-top:16px;font-size:12.5px;color:#8a93a3}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var bank = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" '
      + 'stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/></svg>';
    var plus = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" '
      + 'stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';

    var wrap = document.createElement('div');
    wrap.className = 'amf-empty';
    wrap.innerHTML =
      '<div class="amf-empty-card">' +
        '<div class="amf-empty-ic">' + bank + '</div>' +
        '<h2>Connectez vos comptes pour commencer</h2>' +
        '<p>Cette page se remplira automatiquement dès que vous aurez relié un compte bancaire ou un placement.</p>' +
        '<a class="amf-empty-cta" href="comptes-connectes.html">' + plus + ' Connecter mes comptes</a>' +
        '<div class="amf-empty-hint">Synchronisation sécurisée · plus de 300 banques compatibles</div>' +
      '</div>';
    main.appendChild(wrap);
  }

  /* Popup d'abonnement (démo) : choisir un plan met à jour l'abonnement et recharge la page */
  function openSubscribeModal() {
    if (document.querySelector('.amf-sub-veil')) return;
    ensureSubCss();
    var PLANS = [
      { id:'premium', name:'Premium', price:'4,99 €', cyc:'/ mois',
        feats:['Comptes connectés illimités','Analyses & performance avancées','Académie complète (Interm. & Avancé)','Assistant IA illimité'] },
      { id:'expert', name:'Expert', price:'9,99 €', cyc:'/ mois', reco:true,
        feats:['Tout le plan Premium','Alertes intelligentes de l\'IA','Scanner de frais avancé','Rapports fiscaux complets','Support prioritaire'] }
    ];
    var check = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d8a4e" stroke-width="2.6" '
      + 'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var cards = PLANS.map(function (p) {
      return '<div class="amf-plan' + (p.reco ? ' reco' : '') + '">' +
        (p.reco ? '<span class="amf-ribbon">Recommandé</span>' : '') +
        '<div class="amf-pn">' + p.name + '</div>' +
        '<div class="amf-pp">' + p.price + '<small>' + p.cyc + '</small></div>' +
        '<ul>' + p.feats.map(function (f) { return '<li>' + check + '<span>' + f + '</span></li>'; }).join('') + '</ul>' +
        '<button type="button" class="amf-choose" data-plan="' + p.id + '">Choisir ' + p.name + '</button>' +
      '</div>';
    }).join('');

    var veil = document.createElement('div');
    veil.className = 'amf-sub-veil';
    veil.innerHTML =
      '<div class="amf-sub" role="dialog" aria-modal="true">' +
        '<button type="button" class="amf-sub-x" aria-label="Fermer">&times;</button>' +
        '<h3>Passez à l\'offre supérieure</h3>' +
        '<p class="amf-sub-lead">Débloquez les analyses, outils et contenus avancés d\'AllMyFunds.</p>' +
        '<div class="amf-plans">' + cards + '</div>' +
        '<a class="amf-sub-all" href="abonnement.html">Comparer toutes les offres</a>' +
      '</div>';
    document.body.appendChild(veil);

    function close() { veil.remove(); }
    veil.addEventListener('click', function (e) { if (e.target === veil) close(); });
    veil.querySelector('.amf-sub-x').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', esc);} });
    veil.querySelectorAll('.amf-choose').forEach(function (b) {
      b.addEventListener('click', function () { AMF.setPlan(b.getAttribute('data-plan')); location.reload(); });
    });
  }

  var _subCss = false;
  function ensureSubCss() {
    if (_subCss) return; _subCss = true;
    var css = ''
      + '.amf-sub-veil{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;'
      + 'padding:20px;background:rgba(6,20,48,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}'
      + '.amf-sub{position:relative;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;background:#fff;border-radius:22px;'
      + 'padding:30px clamp(20px,3vw,34px) 26px;box-shadow:0 40px 90px -30px rgba(0,30,90,.55);font-family:inherit}'
      + '.amf-sub-x{position:absolute;top:16px;right:18px;width:34px;height:34px;border-radius:50%;border:none;background:#f3f7fc;'
      + 'color:#5a6475;font-size:22px;line-height:1;cursor:pointer}'
      + '.amf-sub-x:hover{background:#e7ecf5}'
      + '.amf-sub h3{font-size:22px;font-weight:700;color:#013a87;letter-spacing:-.02em;margin-bottom:6px}'
      + '.amf-sub-lead{font-size:14px;color:#6b7280;margin-bottom:20px}'
      + '.amf-plans{display:grid;grid-template-columns:1fr 1fr;gap:14px}'
      + '.amf-plan{position:relative;border:1.5px solid #e7ebf2;border-radius:16px;padding:18px 16px 16px;display:flex;flex-direction:column}'
      + '.amf-plan.reco{border-color:#004AAD;box-shadow:0 14px 34px -18px rgba(0,74,173,.55)}'
      + '.amf-ribbon{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#004AAD;color:#fff;font-size:10px;'
      + 'font-weight:700;border-radius:999px;padding:3px 12px;white-space:nowrap}'
      + '.amf-pn{font-weight:700;font-size:15px;color:#0f1622}'
      + '.amf-pp{font-weight:800;font-size:26px;color:#0f1622;margin:6px 0 12px}'
      + '.amf-pp small{font-size:.5em;font-weight:600;color:#8a93a3}'
      + '.amf-plan ul{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:8px;flex:1}'
      + '.amf-plan li{display:flex;gap:8px;font-size:12px;color:#3c4655;line-height:1.35;align-items:flex-start}'
      + '.amf-plan li svg{flex:0 0 auto;margin-top:1px}'
      + '.amf-choose{border:none;border-radius:11px;padding:11px;font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;'
      + 'background:#004AAD;color:#fff;width:100%}'
      + '.amf-choose:hover{background:#013a87}'
      + '.amf-sub-all{display:block;text-align:center;margin-top:16px;font-size:13px;font-weight:600;color:#004AAD}'
      + '.amf-sub-all:hover{text-decoration:underline}'
      + '@media(max-width:560px){.amf-plans{grid-template-columns:1fr}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
})();
