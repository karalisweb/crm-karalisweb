# Karalisweb Design System

> Guida di riferimento per uniformare la grafica di tutte le app Karalisweb.
> Basato sullo stile di **Content HUB v1.5.0**.

---

## 1. Tema Generale

**Dark theme** con sfondo navy/blu scuro, accenti oro/arancione e tipografia moderna.

L'interfaccia trasmette un senso di **professionalita**, **pulizia** e **modernita**, con ampio uso di whitespace e contrasto elevato tra sfondi scuri e testo chiaro.

---

## 2. Palette Colori

### 2.1 Sfondi

| Token                | Hex         | Uso                                      |
|----------------------|-------------|------------------------------------------|
| `--bg-primary`       | `#0d1521`   | Sfondo principale dell'app               |
| `--bg-secondary`     | `#132032`   | Card, sidebar, header, modali            |
| `--bg-tertiary`      | `#1a2d44`   | Input, elementi annidati, item di lista  |
| `--bg-hover`         | `#234058`   | Stato hover su elementi interattivi      |

### 2.2 Accenti (Brand Karalisweb)

| Token                      | Hex         | Uso                                    |
|----------------------------|-------------|----------------------------------------|
| `--accent-primary`         | `#d4a726`   | Colore brand principale (oro/giallo)   |
| `--accent-primary-hover`   | `#e6b82e`   | Hover sull'accento primario            |
| `--accent-secondary`       | `#2d7d9a`   | Badge, accenti secondari (blu/teal)    |
| `--accent-tertiary`        | `#1e5c7a`   | Accenti blu scuro                      |

### 2.3 Testo

| Token              | Hex         | Uso                                        |
|--------------------|-------------|--------------------------------------------|
| `--text-primary`   | `#f5f5f7`   | Testo principale (titoli, contenuti)       |
| `--text-secondary` | `#a1a1aa`   | Testo secondario (meta info, descrizioni)  |
| `--text-muted`     | `#71717a`   | Testo meno importante (hint, placeholder)  |

### 2.4 Bordi

| Token              | Hex         | Uso                       |
|--------------------|-------------|---------------------------|
| `--border-color`   | `#2a2a35`   | Bordo standard            |
| `--border-hover`   | `#3a3a45`   | Bordo hover (piu chiaro)  |

### 2.5 Colori di Stato

| Token         | Hex         | Uso           |
|---------------|-------------|---------------|
| `--success`   | `#22c55e`   | Successo      |
| `--warning`   | `#eab308`   | Attenzione    |
| `--error`     | `#ef4444`   | Errore        |
| `--info`      | `#3b82f6`   | Informativo   |

### 2.6 Colori CRM-Specifici

| Tipo                         | Colore      |
|------------------------------|-------------|
| Lead Hot (score 80-100)      | `#ef4444`   |
| Lead Warm (score 60-79)      | `#eab308`   |
| Lead Cold (score < 40)       | `#3b82f6`   |
| Pipeline Won                 | `#22c55e`   |
| Pipeline Lost                | `#ef4444`   |
| Audit Running                | `#3b82f6`   |
| Audit Completed              | `#22c55e`   |

---

## 3. Tipografia

### 3.1 Font

| Ruolo         | Font             | Pesi disponibili     | Importazione |
|---------------|------------------|----------------------|--------------|
| **UI/Testo**  | Space Grotesk    | 300, 400, 500, 600, 700 | Google Fonts |
| **Codice/Dati** | JetBrains Mono | 400, 500             | Google Fonts |

```
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### 3.2 Font Stack

```css
font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
```

### 3.3 Impostazioni Base

| Proprieta                 | Valore   |
|---------------------------|----------|
| Font size base            | `16px`   |
| Line height               | `1.6`    |
| -webkit-font-smoothing    | `antialiased` |
| -moz-osx-font-smoothing   | `grayscale`   |

### 3.4 Scala Tipografica Standard

La scala di riferimento e basata su quella di Tailwind CSS, per garantire coerenza tra tutte le app (indipendentemente dal fatto che usino Tailwind o CSS custom).

#### Scala Base

| Nome token     | Dimensione  | Equivalente Tailwind | Line Height |
|----------------|-------------|----------------------|-------------|
| `--text-xs`    | `0.75rem` (12px)  | `text-xs`      | 1rem (16px) |
| `--text-sm`    | `0.875rem` (14px) | `text-sm`      | 1.25rem (20px) |
| `--text-base`  | `1rem` (16px)     | `text-base`    | 1.5rem (24px) |
| `--text-lg`    | `1.125rem` (18px) | `text-lg`      | 1.75rem (28px) |
| `--text-xl`    | `1.25rem` (20px)  | `text-xl`      | 1.75rem (28px) |
| `--text-2xl`   | `1.5rem` (24px)   | `text-2xl`     | 2rem (32px) |
| `--text-3xl`   | `1.875rem` (30px) | `text-3xl`     | 2.25rem (36px) |
| `--text-4xl`   | `2.25rem` (36px)  | `text-4xl`     | 2.5rem (40px) |

#### Mappatura sui Componenti

| Elemento             | Scala      | Dimensione  | Font Weight | Note                               |
|----------------------|------------|-------------|-------------|-------------------------------------|
| h1 / Titolo pagina   | `text-2xl` | 24px        | 600         | --                                  |
| h1 Login             | `text-3xl` | 30px        | 600         | Gradiente oro > teal                |
| Card title / h2-h3   | `text-lg`  | 18px        | 600         | --                                  |
| h4 / Sezione         | `text-base`| 16px        | 500-600     | --                                  |
| Body text             | `text-sm`  | 14px        | 400         | Colore `--text-primary`             |
| Testo secondario      | `text-sm`  | 14px        | 400         | Colore `--text-secondary`           |
| Label form            | `text-sm`  | 14px        | 500         | Colore `--text-secondary`           |
| Tab button            | `text-sm`  | 14px        | 500         | --                                  |
| Nav item              | `text-sm`  | 14px        | 400-500     | --                                  |
| Badge                 | `text-xs`  | 12px        | 500         | --                                  |
| Section title nav     | `text-xs`  | 12px        | 600         | UPPERCASE, letter-spacing 0.05em    |
| Hint / Meta           | `text-xs`  | 12px        | 400         | Colore `--text-muted`               |
| Status badge          | `text-xs`  | 12px        | 600         | UPPERCASE, letter-spacing 0.5px     |
| Stat value (grande)   | `text-3xl` | 30px        | 600         | Colore `--accent-primary`           |

---

## 4. Spacing & Layout

### 4.1 Design Tokens

| Token               | Valore   |
|----------------------|----------|
| `--sidebar-width`    | `260px`  |
| `--header-height`    | `64px`   |
| `--radius-sm`        | `6px`    |
| `--radius-md`        | `8px`    |
| `--radius-lg`        | `12px`  |

### 4.2 Ombre

| Token           | Valore                             |
|-----------------|------------------------------------|
| `--shadow-sm`   | `0 2px 4px rgba(0, 0, 0, 0.3)`    |
| `--shadow-md`   | `0 4px 12px rgba(0, 0, 0, 0.4)`   |
| `--shadow-lg`   | `0 8px 24px rgba(0, 0, 0, 0.5)`   |

### 4.3 Sistema di Spaziatura

Unita base: **0.5rem (8px)**

| Classe    | Valore     |
|-----------|------------|
| `.gap-1`  | `0.5rem`   |
| `.gap-2`  | `1rem`     |
| `.gap-3`  | `1.5rem`   |
| `.mt-1`   | `0.5rem`   |
| `.mt-2`   | `1rem`     |
| `.mt-3`   | `1.5rem`   |
| `.mt-4`   | `2rem`     |

Spaziature comuni: `0.5rem`, `0.75rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`

### 4.4 Layout Principale

```
+------------------+---------------------------------------------+
|                  |              HEADER (64px)                   |
|    SIDEBAR       +---------------------------------------------+
|    (260px)       |                                             |
|                  |           MAIN CONTENT                      |
|   - Logo         |           padding: 2rem                     |
|   - Navigazione  |                                             |
|   - Footer       |                                             |
+------------------+---------------------------------------------+
```

- **Sidebar**: fissa a sinistra, larghezza 260px, altezza 100vh
- **Header**: fisso in alto, parte da 260px (dopo sidebar), altezza 64px
- **Contenuto**: margin-left 260px, margin-top 64px, padding 2rem

---

## 5. Componenti

### 5.1 Bottoni

#### Base (`.btn`)

```css
display: inline-flex;
align-items: center;
justify-content: center;
gap: 0.5rem;
padding: 0.75rem 1.5rem;
border: none;
border-radius: 8px;        /* --radius-md */
font-size: 0.9rem;
font-weight: 500;
cursor: pointer;
transition: all 0.2s;
```

#### Varianti

| Variante        | Background                                            | Colore testo | Hover                                               |
|-----------------|-------------------------------------------------------|--------------|------------------------------------------------------|
| **Primary**     | `linear-gradient(135deg, #d4a726, #ff8f65)`           | `white`      | translateY(-2px), box-shadow arancione               |
| **Secondary**   | `#1a2d44` + bordo `#2a2a35`                           | `#f5f5f7`    | Background piu chiaro, bordo piu chiaro              |
| **Success**     | `linear-gradient(135deg, #22c55e, #34d399)`           | `white`      | --                                                   |
| **Danger**      | `linear-gradient(135deg, #ef4444, #f87171)`           | `white`      | --                                                   |
| **Link**        | `transparent`, nessun bordo                           | `#d4a726`    | Colore hover `#e6b82e`                               |
| **Success Outline** | `transparent`, bordo 2px `#22c55e`                | `#22c55e`    | Background rgba(16, 185, 129, 0.1)                   |

**Nota importante**: il bottone **Primary** usa un gradiente che va dall'**oro (#d4a726) all'arancione (#ff8f65)**, con ombra hover `rgba(255, 107, 53, 0.3)`. Questo e il gradiente firma dell'app.

#### Dimensioni

| Variante       | Padding             | Font Size  | Dimensioni     |
|----------------|---------------------|------------|----------------|
| Default        | `0.75rem 1.5rem`    | `0.9rem`   | --             |
| `.btn-small`   | `0.5rem 1rem`       | `0.8rem`   | --             |
| `.btn-icon`    | `0`                 | --         | `32x32px`      |
| `.btn-full`    | Come default        | Come default | `width: 100%` |

#### Stato Disabled

```css
opacity: 0.6;
cursor: not-allowed;
```

### 5.2 Card

#### Base (`.card`)

```css
background: #132032;       /* --bg-secondary */
border: 1px solid #2a2a35; /* --border-color */
border-radius: 12px;       /* --radius-lg */
padding: 1.5rem;
transition: border-color 0.2s;
```

#### Hover
```css
border-color: #3a3a45;     /* --border-hover */
```

#### Struttura

```
+------------------------------------------+
|  CARD HEADER (flex, space-between)       |
|  [Titolo]                    [Badge/Azioni]|
+------------------------------------------+
|  CARD BODY                               |
|  Contenuto (colore --text-secondary)     |
+------------------------------------------+
|  CARD FOOTER (border-top, flex, gap)     |
|  [Info]  [Info]  [Azioni]                |
+------------------------------------------+
```

#### Grid

```css
/* Card grid standard */
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
gap: 1.5rem;

/* Stats grid */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
gap: 1rem;
```

### 5.3 Stat Card

```css
background: #132032;
border: 1px solid #2a2a35;
border-radius: 12px;
padding: 1.25rem;
```

- **Valore**: font-size `2rem`, weight 600, colore `#d4a726` (oro)
- **Label**: font-size `0.85rem`, colore `--text-secondary`

### 5.4 Form

#### Input (`.form-input`)

```css
width: 100%;
padding: 0.75rem 1rem;
background: #1a2d44;       /* --bg-tertiary */
border: 1px solid #2a2a35; /* --border-color */
border-radius: 8px;        /* --radius-md */
color: #f5f5f7;            /* --text-primary */
font-size: 1rem;
transition: all 0.2s;
```

#### Focus

```css
outline: none;
border-color: #d4a726;     /* --accent-primary */
box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
```

**Nota**: il glow del focus usa un arancione `rgba(255, 107, 53, 0.1)`, coerente col gradiente dei bottoni.

#### Label (`.form-label`)

```css
font-size: 0.875rem;
font-weight: 500;
color: #a1a1aa;            /* --text-secondary */
```

#### Textarea (`.form-textarea`)

```css
min-height: 150px;
resize: vertical;
font-family: 'JetBrains Mono', monospace;
font-size: 0.9rem;
line-height: 1.6;
```

#### Select (`.form-select`)

- Stesso stile degli input
- `appearance: none` con freccia SVG personalizzata a destra
- Padding-right: `2.5rem` per la freccia

#### Hint (`.form-hint`)

```css
font-size: 0.75rem;
color: #71717a;            /* --text-muted */
```

### 5.5 Toggle Switch

```
Dimensioni: 44px x 24px
Pallino: 18px, raggio 50%
```

- **Off**: background `--bg-tertiary`, bordo `--border-color`, pallino colore `--text-muted`
- **On**: background e bordo `--accent-primary` (oro), pallino bianco, translateX(20px)
- Transizione: `all 0.2s`

### 5.6 Badge

#### Base (`.badge`)

```css
display: inline-flex;
align-items: center;
gap: 0.35rem;
padding: 0.25rem 0.75rem;
border-radius: 6px;        /* --radius-sm */
font-size: 0.75rem;
font-weight: 500;
```

#### Varianti

| Variante            | Background                      | Colore testo   |
|---------------------|---------------------------------|----------------|
| `.badge-draft`      | `rgba(234, 179, 8, 0.15)`      | `#eab308`      |
| `.badge-ready`      | `rgba(34, 197, 94, 0.15)`      | `#22c55e`      |
| `.badge-generating` | `rgba(59, 130, 246, 0.15)`     | `#3b82f6`      |
| `.badge-published`  | `rgba(78, 205, 196, 0.15)`     | `#2d7d9a`      |

**Principio**: background al 15% di opacita del colore del testo.

#### Status Badge (`.status-badge`)

```css
font-size: 0.65rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.5px;
```

| Stato               | Background                      | Colore testo   |
|---------------------|---------------------------------|----------------|
| `.status-new`       | `rgba(59, 130, 246, 0.15)`     | `#3b82f6`      |
| `.status-to-call`   | `rgba(234, 179, 8, 0.15)`      | `#eab308`      |
| `.status-called`    | `rgba(168, 85, 247, 0.15)`     | `#a855f7`      |
| `.status-interested`| `rgba(34, 197, 94, 0.15)`      | `#22c55e`      |
| `.status-won`       | `rgba(34, 197, 94, 0.15)`      | `#22c55e`      |
| `.status-lost`      | `rgba(239, 68, 68, 0.15)`      | `#ef4444`      |
| `.status-audit`     | `rgba(59, 130, 246, 0.15)`     | `#3b82f6`      |
| `.status-meeting`   | `rgba(78, 205, 196, 0.15)`     | `#2d7d9a`      |

### 5.7 Tabs

```css
/* Container */
display: flex;
gap: 0.5rem;
border-bottom: 1px solid #2a2a35;
margin-bottom: 1.5rem;

/* Tab button */
padding: 0.75rem 1.25rem;
font-size: 0.9rem;
font-weight: 500;
border-bottom: 2px solid transparent;
margin-bottom: -1px;

/* Tab attivo */
color: #d4a726;                     /* --accent-primary */
border-bottom-color: #d4a726;       /* --accent-primary */
```

### 5.8 Modal

#### Overlay

```css
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.7);
z-index: 1000;
/* Animazione: opacity 0 > 1, visibility hidden > visible */
```

#### Modal Box

```css
background: #132032;       /* --bg-secondary */
border: 1px solid #2a2a35; /* --border-color */
border-radius: 12px;       /* --radius-lg */
max-width: 560px;          /* 800px per modal-large */
max-height: 90vh;
overflow-y: auto;
/* Animazione: scale 0.95 > 1 */
```

#### Struttura

```
+------------------------------------------+
|  HEADER  [Titolo]            [X chiudi]  |
|  padding: 1.25rem 1.5rem                 |
|  border-bottom: 1px solid --border-color |
+------------------------------------------+
|  BODY                                    |
|  padding: 1.5rem                         |
+------------------------------------------+
|  FOOTER  (flex, justify-end, gap 0.75rem)|
|  padding: 1rem 1.5rem                    |
|  border-top: 1px solid --border-color    |
+------------------------------------------+
```

### 5.9 Toast / Notifiche

```css
/* Container: fisso in basso a destra */
position: fixed;
bottom: 2rem;
right: 2rem;
z-index: 2000;

/* Singolo toast */
background: #1a2d44;       /* --bg-tertiary */
border: 1px solid #2a2a35;
border-radius: 8px;
padding: 1rem 1.25rem;
min-width: 300px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
animation: slideIn 0.3s ease;
```

#### Varianti (bordo sinistro colorato 3px)

| Tipo        | Border-left            |
|-------------|------------------------|
| `.success`  | `3px solid #22c55e`    |
| `.error`    | `3px solid #ef4444`    |
| `.warning`  | `3px solid #eab308`    |
| `.info`     | `3px solid #3b82f6`    |

### 5.10 Loading / Spinner

```css
/* Spinner */
width: 40px;
height: 40px;
border: 3px solid #2a2a35;         /* --border-color */
border-top-color: #d4a726;         /* --accent-primary */
border-radius: 50%;
animation: spin 0.8s linear infinite;

/* Overlay */
background: rgba(10, 10, 15, 0.9);
border-radius: 8px;
```

### 5.11 Progress Bar

```css
/* Track */
height: 8px;
background: #1a2d44;      /* --bg-tertiary */
border-radius: 4px;

/* Fill */
background: linear-gradient(90deg, #d4a726, #2d7d9a);
/* Gradiente da oro a teal */
transition: width 0.3s ease;
```

### 5.12 Breadcrumb

```css
font-size: 0.85rem;
gap: 0.5rem;

/* Link */
color: #a1a1aa;            /* --text-secondary */
hover: #d4a726;            /* --accent-primary */

/* Corrente */
color: #f5f5f7;            /* --text-primary */
font-weight: 500;

/* Separatore */
color: #71717a;            /* --text-muted */
```

### 5.13 Empty State

```css
text-align: center;
padding: 4rem 2rem;

/* Icona */
font-size: 3rem;
opacity: 0.5;

/* Titolo */
font-size: 1.1rem;
font-weight: 500;
color: #f5f5f7;

/* Testo */
font-size: 0.9rem;
color: #a1a1aa;
```

---

## 6. Pagine Standard

### 6.1 Login

La pagina di login deve essere **identica** in tutte le app, cambiando solo il nome e il sottotitolo.

```
+------------------------------------------+
|                                          |
|          [Logo KW negativo]              |
|                                          |
|          Nome App                        |
|          Sottotitolo app                 |
|                                          |
|   Email                                 |
|   [________________________]             |
|                                          |
|   Password                              |
|   [________________________]             |
|                                          |
|   [====== Accedi ========]              |
|                                          |
|       Password dimenticata?              |
|                                          |
+------------------------------------------+
```

```css
/* Container pagina */
min-height: 100vh;
display: flex;
align-items: center;
justify-content: center;
background: #0d1521;             /* --bg-primary */
padding: 2rem;

/* Box login */
background: #132032;             /* --bg-secondary */
border: 1px solid #2a2a35;       /* --border-color */
border-radius: 12px;             /* --radius-lg */
padding: 3rem;
width: 100%;
max-width: 400px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); /* --shadow-lg */
```

**Logo nella pagina di login**:
- Usare il **logo negativo** (PNG trasparente, scritte bianche/gialle)
- NO sfondo bianco dietro il logo
- Max-width: `180px`, centrato
- Margin-bottom: `2rem`

**Titolo app (sotto il logo)**:
```css
font-size: 1.75rem;
font-weight: 600;
/* Gradiente oro > teal sul testo */
background: linear-gradient(135deg, #d4a726, #2d7d9a);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

**Sottotitolo**:
```css
color: #a1a1aa;               /* --text-secondary */
font-size: 0.9rem;
margin-top: 0.5rem;
```

**Bottone Accedi**: usa `.btn-primary .btn-full` (gradiente oro>arancione, larghezza 100%)

**Link "Password dimenticata?"**:
```css
color: #a1a1aa;               /* --text-secondary */
font-size: 0.875rem;
/* Hover: colore diventa --accent-primary */
```

---

## 7. Navigazione

### 7.1 Sidebar

```css
position: fixed;
width: 260px;
height: 100vh;
background: #132032;              /* --bg-secondary */
border-right: 1px solid #2a2a35;  /* --border-color */
display: flex;
flex-direction: column;
```

La sidebar e divisa in **4 zone verticali** ben definite:

```
+------------------------------------------+
|  ZONA 1 - HEADER APP                    |
|  [Icona KW] Nome App          v1.0.0    |
+------------------------------------------+
|  ZONA 2 - NAVIGAZIONE PRINCIPALE        |
|  (sezioni specifiche per ogni app)       |
|  Separata da titoli sezione UPPERCASE    |
+------------------------------------------+
|          (spazio flessibile)             |
+------------------------------------------+
|  ZONA 3 - NAVIGAZIONE FISSA             |
|  Profilo | Impostazioni | Guida | Esci  |
+------------------------------------------+
```

#### Zona 1 - Header App (Identita)

L'header della sidebar identifica l'app. E composto da **3 elementi** sempre presenti:

1. **Icona app** - un'icona Lucide rappresentativa dell'app (la stessa usata nella navigazione), dentro un quadrato 40x40
2. **Nome app** - formato "KW NomeApp" in bold
3. **Versione** - formato "vX.Y.Z" in piccolo sotto il nome

**Layout (riferimento CashFlow)**:

```
+------------------------------------------+
|                                          |
|  [ Icona ]  KW NomeApp                  |
|  [ 40x40 ]  v2.0.0                      |
|                                          |
+------------------------------------------+
```

```css
/* Container header */
padding: 1.25rem 1.5rem;
border-bottom: 1px solid #2a2a35;  /* --border-color */
display: flex;
align-items: center;
gap: 0.75rem;

/* Icona app (quadrata con icona Lucide dell'app) */
.app-icon {
    width: 40px;
    height: 40px;
    background: #0d1521;            /* --bg-primary (scuro) */
    border-radius: 8px;             /* --radius-md */
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d4a726;                 /* --accent-primary (oro) */
}

.app-icon svg {
    width: 22px;
    height: 22px;
}

/* Testo app */
.app-name {
    font-size: 0.95rem;            /* ~text-sm/base */
    font-weight: 600;
    color: #f5f5f7;                /* --text-primary */
}

.app-version {
    font-size: 0.75rem;            /* text-xs */
    color: #71717a;                /* --text-muted */
}
```

**Regole per l'icona dell'header**:
- L'icona deve essere una **icona Lucide** coerente con il tema dell'app
- Va dentro un box 40x40 con sfondo `--bg-primary` (scuro) e icona color `--accent-primary` (oro)
- NON usare iniziali o testo, usare sempre un'icona Lucide riconoscibile

**Icone header per app**:

| App          | Icona Lucide       | Motivazione                     |
|--------------|--------------------|---------------------------------|
| Content HUB  | `newspaper`        | Gestione contenuti editoriali   |
| CashFlow     | `wallet`           | Gestione finanziaria            |
| Sales CRM    | `target`           | CRM e pipeline commerciale      |

#### Zona 2 - Navigazione Principale

Questa zona cambia in base all'app. Gli item sono raggruppati per **sezioni** con titolo uppercase.

```css
/* Container navigazione */
flex: 1;
padding: 1rem 0;
overflow-y: auto;

/* Titolo sezione */
font-size: 0.7rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #71717a;            /* --text-muted */
padding: 0 1.5rem;
margin-bottom: 0.5rem;
margin-top: 1rem;          /* Separazione tra sezioni */
```

**Separazione sezioni**: le sezioni sono separate dallo spazio sopra il titolo (`margin-top: 1rem`). Non usare linee/bordi per separare, ma solo lo spazio e i titoli uppercase (stile CashFlow).

#### Item Navigazione (`.nav-item`)

```css
display: flex;
align-items: center;
gap: 0.75rem;
padding: 0.75rem 1rem;
margin: 0 0.5rem;         /* Margine laterale per non toccare i bordi */
border-radius: 8px;
color: #a1a1aa;            /* --text-secondary */
transition: all 0.2s;

/* Hover */
background: #1a2d44;       /* --bg-tertiary */
color: #f5f5f7;            /* --text-primary */

/* Attivo */
background: rgba(255, 107, 53, 0.1);   /* Tinta arancione */
color: #d4a726;                          /* --accent-primary */
```

**Nota**: il background dell'item attivo usa `rgba(255, 107, 53, 0.1)` (arancione al 10%), coerente col gradiente dei bottoni.

#### Zona 3 - Navigazione Fissa (Footer Sidebar)

> **OBBLIGATORIA in tutte le app**. Queste 4 voci devono essere sempre presenti, nello stesso ordine, con le stesse icone.

```css
/* Container footer */
padding: 0.75rem 0;
border-top: 1px solid #2a2a35;    /* --border-color */
margin-top: auto;                   /* Spinge il footer in basso */
```

**Voci fisse (in ordine)**:

| Voce            | Icona SVG                | Descrizione                    |
|-----------------|--------------------------|--------------------------------|
| **Profilo**     | `user` (persona)         | Gestione profilo utente        |
| **Impostazioni**| `settings` (ingranaggio) | Impostazioni dell'app          |
| **Guida**       | `book-open` (libro)      | Documentazione e aiuto         |
| **Esci**        | `log-out` (freccia uscita)| Logout dall'applicazione      |

Stile: stessi `.nav-item` della navigazione principale, senza titolo di sezione.

### 7.2 Header

```css
position: fixed;
height: 64px;
background: #132032;
border-bottom: 1px solid #2a2a35;
padding: 0 1.5rem;
z-index: 100;
```

- **Titolo**: font-size `1.1rem`, weight 500
- **User info**: font-size `0.875rem`, colore `--text-secondary`

---

## 8. Icone

### 8.1 Libreria Standard

**Libreria UNICA di riferimento: [Lucide Icons](https://lucide.dev/)**

> **IMPORTANTE**: Tutte le app Karalisweb devono usare **esclusivamente Lucide**. Non usare altre librerie (Font Awesome, Heroicons, Material Icons, ecc.) e non creare SVG custom. Se serve un'icona, cercarla prima su [lucide.dev/icons](https://lucide.dev/icons).

- **App React/Next.js** (es. Sales CRM): usare il pacchetto `lucide-react`

```bash
# Per progetti React/Next.js
npm install lucide-react
```

### 8.2 Stile SVG

Lucide e una libreria **stroke-based** con stile uniforme:

```css
/* Proprieta di base (automatiche con Lucide) */
stroke: currentColor;       /* Eredita il colore dal genitore */
stroke-width: 2;
fill: none;
stroke-linecap: round;
stroke-linejoin: round;
viewBox: 0 0 24 24;
```

### 8.3 Dimensioni per Contesto

| Contesto          | Dimensioni  | Prop `size` (React) |
|-------------------|-------------|----------------------|
| Icone navigazione | `20x20px`   | `size={20}`          |
| Icone bottone     | `16x16px`   | `size={16}`          |
| Icone header      | `24x24px`   | `size={24}` (default)|
| Icone mobile nav  | `22x22px`   | `size={22}`          |

### 8.4 Icone Obbligatorie (presenti in tutte le app)

#### Navigazione Fissa (Footer Sidebar)

| Voce             | Nome Lucide    | Import React                        |
|------------------|----------------|--------------------------------------|
| Profilo          | `user`         | `import { User } from "lucide-react"` |
| Impostazioni     | `settings`     | `import { Settings } from "lucide-react"` |
| Guida            | `book-open`    | `import { BookOpen } from "lucide-react"` |
| Esci             | `log-out`      | `import { LogOut } from "lucide-react"` |

#### UI Comuni

| Funzione         | Nome Lucide      | Import React                           |
|------------------|------------------|----------------------------------------|
| Menu hamburger   | `menu`           | `import { Menu } from "lucide-react"`  |
| Chiudi / X       | `x`              | `import { X } from "lucide-react"`     |
| Cerca            | `search`         | `import { Search } from "lucide-react"` |
| Aggiungi         | `plus`           | `import { Plus } from "lucide-react"`  |
| Modifica         | `edit-2`         | `import { Edit2 } from "lucide-react"` |
| Elimina          | `trash-2`        | `import { Trash2 } from "lucide-react"` |
| Conferma/Check   | `check`          | `import { Check } from "lucide-react"` |
| Caricamento      | `loader-2`       | `import { Loader2 } from "lucide-react"` |
| Info             | `info`           | `import { Info } from "lucide-react"`  |
| Attenzione       | `alert-triangle` | `import { AlertTriangle } from "lucide-react"` |
| Successo         | `check-circle`   | `import { CheckCircle } from "lucide-react"` |
| Freccia sinistra | `chevron-left`   | `import { ChevronLeft } from "lucide-react"` |
| Freccia destra   | `chevron-right`  | `import { ChevronRight } from "lucide-react"` |

### 8.5 Icone per Sales CRM

| Funzione           | Nome Lucide        |
|--------------------|--------------------|
| Dashboard          | `layout-dashboard` |
| Lead               | `users`            |
| Oggi/Da Chiamare   | `phone`            |
| Da Verificare      | `alert-circle`     |
| Appuntamenti       | `calendar`         |
| Offerte            | `mail`             |
| Clienti Vinti      | `trophy`           |
| Non Target         | `x-circle`         |
| Senza Sito         | `globe`            |
| Persi              | `x-circle`         |
| Nuova Ricerca      | `search`           |
| Ricerche           | `folder-search`    |
| Audit              | `scan`             |
| Pipeline           | `kanban`           |
| Opportunity Score  | `target`           |

### 8.6 Regole per il Colore delle Icone

Le icone **ereditano sempre il colore dal testo** del genitore tramite `currentColor`. Non assegnare mai colori fissi alle icone, a meno che non rappresentino uno stato:

| Contesto                 | Colore                       |
|--------------------------|------------------------------|
| Icona in nav inattivo    | `--text-secondary` (opacity 0.7) |
| Icona in nav attivo      | `--accent-primary` (oro)     |
| Icona in bottone         | `white` o colore del bottone |
| Icona successo           | `--success`                  |
| Icona errore             | `--error`                    |
| Icona warning            | `--warning`                  |
| Icona info               | `--info`                     |

---

## 9. Animazioni & Transizioni

### 9.1 Transizioni Standard

| Contesto     | Durata   |
|--------------|----------|
| Default      | `0.2s`   |
| Modali/Overlay | `0.2-0.3s` |

### 9.2 Keyframes

```css
/* Toast - slide da destra */
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

/* Spinner */
@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Pulse (step attivo) */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Fade in (elementi generati) */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Mobile menu - slide da sotto */
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
```

### 9.3 Effetti Hover

| Componente        | Effetto Hover                                      |
|-------------------|-----------------------------------------------------|
| Bottone primario  | `translateY(-2px)` + ombra arancione                |
| Card              | Border-color piu chiaro                             |
| Project card      | Border-color diventa oro (`--accent-primary`)       |
| Nav item          | Background `--bg-tertiary` + testo piu chiaro       |
| Lead card         | Border oro + background `--bg-secondary`            |

---

## 10. Responsive Design

### 10.1 Breakpoint

| Breakpoint    | Larghezza       | Descrizione        |
|---------------|-----------------|---------------------|
| Desktop       | > 1024px        | Layout completo     |
| Tablet        | 768px - 1024px  | Sidebar ridotta     |
| Mobile        | < 768px         | Sidebar nascosta    |
| Small mobile  | < 480px         | Layout semplificato |

### 10.2 Tablet (max-width: 1024px)

- Sidebar: larghezza ridotta a `220px`
- Griglia impostazioni: 1 colonna

### 10.3 Mobile (max-width: 768px)

- **Sidebar**: nascosta, scorre da sinistra con `translateX(-100%)` > `translateX(0)`
- **Header**: occupa tutta la larghezza
- **Contenuto**: margin-left 0, padding `1.5rem 1rem`
- **Card grid**: 1 colonna
- **Stats grid**: 2 colonne
- **Appare il menu toggle** (hamburger)
- **Toast**: si espandono a tutta la larghezza
- **Bottom nav**: barra fissa in basso con 5 icone principali

### 10.4 Small Mobile (max-width: 480px)

- **Stats grid**: 1 colonna, layout orizzontale (label a sinistra, valore a destra)
- **Modal footer**: bottoni impilati verticalmente, larghezza 100%
- **Header user info**: nascosta
- **Logo sidebar**: ridotto a 120px

---

## 11. Pattern Ricorrenti

### 11.1 Principi di Design

1. **Bordi sottili**: sempre `1px solid`, mai piu spessi (tranne toast: 3px a sinistra)
2. **Background + bordo**: le card/container hanno sempre sia background che bordo
3. **Gerarchie con opacita**: i badge usano il colore al 15% di opacita come sfondo
4. **Gradienti 135deg**: tutti i gradienti usano la stessa angolazione (135 gradi)
5. **Whitespace generoso**: padding e gap ampi per respirare
6. **Interattivita sottile**: hover leggeri, transizioni rapide (0.2s)
7. **Coerenza arancione**: il colore arancione `rgba(255, 107, 53)` e usato come filo conduttore per:
   - Gradiente bottoni primari (`#d4a726` > `#ff8f65`)
   - Ombra hover dei bottoni
   - Glow del focus sugli input
   - Background item navigazione attivo
   - Background project-icon

### 11.2 Regole per Nuovi Componenti

- Background: usa sempre i 3 livelli (`--bg-primary` > `--bg-secondary` > `--bg-tertiary`)
- Bordi: sempre `1px solid var(--border-color)`
- Border-radius: scegliere tra `6px`, `8px` o `12px` in base alla dimensione
- Testo: rispettare la gerarchia `--text-primary` > `--text-secondary` > `--text-muted`
- Interattivita: transizione `all 0.2s`, hover con cambio di border-color o background
- CTA: usare il gradiente oro>arancione solo per l'azione primaria

---

## 12. CSS Variables Completo (Copia-Incolla)

```css
:root {
    /* Sfondi */
    --bg-primary: #0d1521;
    --bg-secondary: #132032;
    --bg-tertiary: #1a2d44;
    --bg-hover: #234058;

    /* Accenti - Karalisweb Colors */
    --accent-primary: #d4a726;
    --accent-primary-hover: #e6b82e;
    --accent-secondary: #2d7d9a;
    --accent-tertiary: #1e5c7a;

    /* Testo */
    --text-primary: #f5f5f7;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;

    /* Bordi */
    --border-color: #2a2a35;
    --border-hover: #3a3a45;

    /* Stati */
    --success: #22c55e;
    --warning: #eab308;
    --error: #ef4444;
    --info: #3b82f6;

    /* Layout */
    --sidebar-width: 260px;
    --header-height: 64px;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;

    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

    /* Scala Tipografica (allineata a Tailwind) */
    --text-xs: 0.75rem;      /* 12px */
    --text-sm: 0.875rem;     /* 14px */
    --text-base: 1rem;       /* 16px */
    --text-lg: 1.125rem;     /* 18px */
    --text-xl: 1.25rem;      /* 20px */
    --text-2xl: 1.5rem;      /* 24px */
    --text-3xl: 1.875rem;    /* 30px */
    --text-4xl: 2.25rem;     /* 36px */
}
```

---

## 13. Gestione Versioni

### 13.1 Formato Versione

Tutte le app usano il formato **Semantic Versioning**: `vMAJOR.MINOR.PATCH` (es. `v2.0.0`)

- **MAJOR**: breaking changes, redesign completo
- **MINOR**: nuove funzionalita
- **PATCH**: bug fix, correzioni minori

### 13.2 Dove Aggiornare la Versione

La versione va aggiornata in **tutti** questi punti ad ogni rilascio:

| Punto                        | Esempio                        | Note                           |
|------------------------------|--------------------------------|--------------------------------|
| `package.json` > `version`  | `"version": "2.0.0"`          | Versione npm/node              |
| `deploy.sh` > `APP_VERSION` | `APP_VERSION="2.0.0"`         | Mostrata nel log di deploy     |
| `deploy.sh` > header commento | `Versione: 2.0.0`          | Documentazione dello script    |
| **Sidebar header** > versione | `v2.0.0`                     | Visibile all'utente nell'UI    |

### 13.3 Dove Mostrare la Versione nell'UI

La versione deve essere visibile in **2 punti**:

1. **Header sidebar** - sotto il nome dell'app (es. "v2.0.0" in `text-xs` colore `--text-muted`)
2. **Pagina Guida** - nel footer o in una sezione "Info app"

### 13.4 Deploy Script Standard

Ogni app deve avere un `deploy.sh` con questa struttura di configurazione in testa:

```bash
# Configurazione (modifica qui per ogni rilascio)
APP_NAME="Nome App"
APP_VERSION="X.Y.Z"        # <-- AGGIORNARE AD OGNI RILASCIO
VPS_HOST="root@xxx.xxx.xxx.xxx"
VPS_PATH="/root/nome-app"
BRANCH="main"
PM2_PROCESS="nome-app"
```

---

## 14. Riferimenti File

| File                          | Contenuto                      |
|-------------------------------|--------------------------------|
| `src/app/globals.css`         | Stili principali e tema        |
| `public/images/logo-karalisweb.png` | Logo Karalisweb          |
| `public/images/favicon.svg`   | Favicon                        |

---

> **Note per il team**: Questo design system va applicato a tutte le app Karalisweb per mantenere coerenza visiva. Ogni nuova app dovrebbe partire importando le CSS variables (sezione 12), usando esclusivamente Lucide Icons (sezione 8), rispettando la scala tipografica standard (sezione 3.4) e allineando la gestione versioni (sezione 13).
