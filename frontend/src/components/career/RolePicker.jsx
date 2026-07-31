import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Plus, X } from 'lucide-react';
import { ROLE_CATALOG } from '../../data/roleCatalog';

/**
 * Select-based role picker (not free text). Users can type to *filter* the
 * list, but a value is only committed when an option is actually clicked/
 * selected — matching, unmatched keystrokes never become the value.
 */
export function RoleSelect({ value, onChange, placeholder = 'Select target role' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const wrapRef = useRef(null);

  const selected = ROLE_CATALOG.find(r => r.label === value);
  const filtered = ROLE_CATALOG.filter(r => r.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const commit = (label) => {
    onChange(label);
    setOpen(false);
    setQuery('');
    setCustomMode(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field flex items-center justify-between text-left cursor-pointer"
      >
        <span className={value ? 'text-white' : 'text-white/30'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full max-h-80 overflow-hidden rounded-xl glass-card border border-purple-500/30 shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
            <Search className="w-4 h-4 text-white/30" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search roles..."
              className="bg-transparent outline-none text-sm text-white placeholder-white/30 w-full"
            />
          </div>

          <div className="overflow-y-auto py-1">
            {filtered.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => commit(r.label)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-purple-500/10 transition-colors"
              >
                <span className={selected?.id === r.id ? 'text-purple-300 font-semibold' : 'text-white/85'}>{r.label}</span>
                {selected?.id === r.id && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            ))}

            {filtered.length === 0 && !customMode && (
              <div className="px-4 py-3 text-sm text-white/40">No matching role.</div>
            )}

            <div className="border-t border-white/10 mt-1 pt-1">
              {!customMode ? (
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full text-left px-4 py-2.5 text-sm text-cyan-300/90 hover:bg-cyan-500/10 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Other role (specify)
                </button>
              ) : (
                <div className="px-3 py-2 flex items-center gap-2">
                  <input
                    autoFocus
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customValue.trim()) commit(customValue.trim()); }}
                    placeholder="Type an exact role title..."
                    className="input-field !py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!customValue.trim()}
                    onClick={() => commit(customValue.trim())}
                    className="btn-primary !px-3 !py-2 text-xs shrink-0"
                  >
                    Use
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Chip-based multi-select for skills. Populated from the selected role's
 * curated skill list so choices stay accurate per role; a small "add other"
 * affordance covers skills not in the preset list without reverting to a
 * free-typing-only field.
 */
export function SkillMultiSelect({ roleLabel, value = [], onChange }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const role = ROLE_CATALOG.find(r => r.label === roleLabel);
  const presetSkills = role ? role.skills : [];
  const extraSelected = value.filter(v => !presetSkills.includes(v));

  const toggle = (skill) => {
    if (value.includes(skill)) onChange(value.filter(s => s !== skill));
    else onChange([...value, skill]);
  };

  const removeExtra = (skill) => onChange(value.filter(s => s !== skill));

  const addCustom = () => {
    const v = customValue.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setCustomValue('');
    setCustomOpen(false);
  };

  if (!role) {
    return (
      <div className="text-sm text-white/40 italic px-1 py-2">
        Select a target role above to see relevant skill options.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presetSkills.map(skill => {
        const active = value.includes(skill);
        return (
          <button
            type="button"
            key={skill}
            onClick={() => toggle(skill)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/60 text-white'
                : 'bg-white/5 border-white/15 text-white/50 hover:border-purple-400/40 hover:text-white/80'
            }`}
          >
            {active && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
            {skill}
          </button>
        );
      })}

      {extraSelected.map(skill => (
        <span key={skill} className="px-3 py-1.5 rounded-full text-xs font-medium border border-cyan-400/50 bg-cyan-500/10 text-cyan-200 flex items-center gap-1.5">
          {skill}
          <button type="button" onClick={() => removeExtra(skill)} className="hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {!customOpen ? (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-white/25 text-white/50 hover:text-white hover:border-purple-400/50 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add other skill
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setCustomOpen(false); }}
            placeholder="Skill name"
            className="input-field !py-1.5 !px-3 text-xs w-32"
          />
          <button type="button" onClick={addCustom} className="btn-primary !px-2 !py-1.5 text-xs">Add</button>
        </div>
      )}
    </div>
  );
}
