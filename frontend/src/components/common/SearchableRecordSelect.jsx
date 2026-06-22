import { useEffect, useMemo, useRef, useState } from 'react'

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function SearchableRecordSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Rechercher et sélectionner...',
  emptyLabel = 'Aucun résultat',
  className = '',
  disabled = false,
  required = false,
}) {
  const wrapperRef = useRef(null)
  const selected = options.find((option) => String(option.value) === String(value))
  const [query, setQuery] = useState(selected?.label || '')
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) setQuery(selected?.label || '')
  }, [open, selected?.label])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const filtered = useMemo(() => {
    const needle = normalize(query)
    if (!needle || selected?.label === query) return options.slice(0, 50)

    return options
      .filter((option) =>
        normalize(
          [option.label, option.description, option.keywords, option.value]
            .filter(Boolean)
            .join(' '),
        ).includes(needle),
      )
      .slice(0, 50)
  }, [options, query, selected?.label])

  function choose(option) {
    onChange(option?.value || '')
    setQuery(option?.label || '')
    setTouched(true)
    setOpen(false)
  }

  const showInvalid = required && touched && !value

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        className={`input pr-9 ${showInvalid ? 'border-red-400 focus:ring-red-400' : ''}`}
        disabled={disabled}
        aria-invalid={showInvalid}
        aria-required={required}
        value={open ? query : selected?.label || query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setTouched(true)
          if (!event.target.value) onChange('')
        }}
        onBlur={() => setTouched(true)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {value && !disabled && (
        <button
          type="button"
          className="absolute right-2 top-2 text-sm text-slate-400 hover:text-red-500"
          onClick={() => choose(null)}
          aria-label="Effacer la sélection"
        >
          ×
        </button>
      )}
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">
              {emptyLabel}
            </div>
          )}
          {filtered.map((option) => (
            <button
              type="button"
              key={`${option.value}-${option.label}`}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span className="block font-medium text-slate-800">
                {option.label}
              </span>
              {option.description && (
                <span className="block text-xs text-slate-500">
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
