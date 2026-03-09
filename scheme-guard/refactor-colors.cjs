const fs = require('fs');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
    // Typography
    { rx: /\btext-white\b/g, repl: 'text-content-primary' },
    { rx: /\btext-slate-100\b/g, repl: 'text-content-primary' },
    { rx: /\btext-slate-200\b/g, repl: 'text-content-primary' },
    { rx: /\btext-slate-300\b/g, repl: 'text-content-primary' },
    { rx: /\btext-slate-400\b/g, repl: 'text-content-secondary' },
    { rx: /\btext-slate-500\b/g, repl: 'text-content-muted' },
    { rx: /\btext-slate-600\b/g, repl: 'text-content-muted' },
    { rx: /\btext-slate-700\b/g, repl: 'text-content-muted' },

    // Accents (Indigo)
    { rx: /\btext-indigo-400\b/g, repl: 'text-accent-primary' },
    { rx: /\btext-indigo-500\b/g, repl: 'text-accent-primary' },
    { rx: /\bbg-indigo-500\b/g, repl: 'bg-accent-primary' },
    { rx: /\bbg-indigo-600\b/g, repl: 'bg-accent-primary' },
    { rx: /\bborder-indigo-500\b/g, repl: 'border-accent-primary' },
    { rx: /\bborder-indigo-400\b/g, repl: 'border-accent-primary' },
    { rx: /\b(group-hover:text-)indigo-500\b/g, repl: '$1accent-primary' },
    { rx: /\btext-indigo-100\b/g, repl: 'text-content-primary' },
    { rx: /\btext-indigo-50\b/g, repl: 'text-content-primary' },
    { rx: /\bbg-indigo-500\/10\b/g, repl: 'bg-accent-glow' },

    // Surfaces & Backgrounds
    { rx: /\bbg-slate-900\b/g, repl: 'bg-surface-card' },
    { rx: /\bbg-slate-800\b/g, repl: 'bg-surface-card' },
    { rx: /\bbg-\[\#07090f\]\b/g, repl: 'bg-surface-main' },
    { rx: /\bbg-\[\#060a14\]\/60\b/g, repl: 'bg-surface-main/60' },
    { rx: /\bbg-\[\#080d1a\]\/80\b/g, repl: 'bg-surface-main/80' },

    // Translucent utility backgrounds
    { rx: /\bbg-white\/5\b/g, repl: 'bg-surface-input' },
    { rx: /\bbg-white\/10\b/g, repl: 'bg-surface-input' },
    { rx: /\bbg-white\/8\b/g, repl: 'bg-surface-input' },

    // Borders
    { rx: /\bborder-white\/5\b/g, repl: 'border-border-subtle' },
    { rx: /\bborder-white\/10\b/g, repl: 'border-border-subtle' },
    { rx: /\bborder-white\/20\b/g, repl: 'border-border-hover' },
    { rx: /\bborder-slate-700\b/g, repl: 'border-border-subtle' },
    { rx: /\bborder-slate-800\b/g, repl: 'border-border-subtle' },
];

let newContent = content;
replacements.forEach(({ rx, repl }) => {
    newContent = newContent.replace(rx, repl);
});

fs.writeFileSync(file, newContent);
console.log('App.jsx classes refactored!');
