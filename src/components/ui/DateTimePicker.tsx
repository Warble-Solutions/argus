'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'

interface DateTimePickerProps {
  name: string
  id?: string
  required?: boolean
  className?: string
  defaultValue?: string
}

export default function DateTimePicker({
  name,
  id,
  required = false,
  className = '',
  defaultValue,
}: DateTimePickerProps) {
  // Extract initial date and time if defaultValue is provided
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')

  useEffect(() => {
    if (defaultValue) {
      try {
        const d = new Date(defaultValue)
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().split('T')[0])
          const h = d.getHours().toString().padStart(2, '0')
          const m = d.getMinutes().toString().padStart(2, '0')
          setTime(`${h}:${m}`)
        }
      } catch (e) {
        // ignore invalid defaults
      }
    }
  }, [defaultValue])

  // Generate 12-hour AM/PM options (every 30 mins)
  const timeOptions = []
  for (let i = 0; i < 24; i++) {
    const ampm = i < 12 ? 'AM' : 'PM'
    const hour12 = i % 12 === 0 ? 12 : i % 12
    const h24 = i.toString().padStart(2, '0')
    
    timeOptions.push({ value: `${h24}:00`, label: `${hour12}:00 ${ampm}` })
    timeOptions.push({ value: `${h24}:30`, label: `${hour12}:30 ${ampm}` })
  }

  // Combine into a format PostgreSQL understands, enforcing IST offset (+05:30)
  // This explicitly sets the timestamp to Indian Standard Time regardless of local browser setting
  const combinedValue = date && time 
    ? `${date}T${time}:00+05:30` 
    : ''

  return (
    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
      {/* Hidden input for the actual form submission */}
      <input type="hidden" name={name} value={combinedValue} />

      <div style={{ position: 'relative', flex: 1 }}>
        <input
          id={id}
          type="date"
          className={className}
          required={required}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ position: 'relative', flex: 1 }}>
        <select
          className={className}
          required={required && !!date} // only require time if date is set (or if overall required is true)
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{ width: '100%', appearance: 'none', cursor: 'pointer' }}
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
          <Clock size={16} />
        </div>
      </div>
    </div>
  )
}
