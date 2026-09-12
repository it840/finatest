import React from 'react'

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <rect x="2.5" y="2.5" width="6.5" height="8" rx="1" />
      <rect x="11" y="2.5" width="6.5" height="5" rx="1" />
      <rect x="11" y="10" width="6.5" height="7.5" rx="1" />
      <rect x="2.5" y="13" width="6.5" height="4.5" rx="1" />
    </svg>
  )
}

export function AssetsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <path d="M10 2.5l7 3.75v7.5L10 17.5l-7-3.75v-7.5L10 2.5z" />
      <path d="M3 6.25L10 10l7-3.75M10 10v7.5" />
    </svg>
  )
}

export function PhysicalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <rect x="4" y="3.5" width="12" height="14" rx="1.5" />
      <path d="M7.5 2.5h5a.5.5 0 01.5.5v1.5h-6V3a.5.5 0 01.5-.5z" />
      <path d="M7 10.5l1.8 1.8L13 8.3" />
    </svg>
  )
}

export function MovementIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <path d="M3 6.5h11.5M14.5 6.5L11.5 3.5M14.5 6.5l-3 3" />
      <path d="M17 13.5H5.5M5.5 13.5l3-3M5.5 13.5l3 3" />
    </svg>
  )
}

export function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" />
      <path d="M7 12v2.5M10 9v5.5M13 6.5v8" />
    </svg>
  )
}

export function LogHistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <circle cx="10" cy="10.5" r="7" />
      <path d="M10 6.5v4l2.8 1.6" />
      <path d="M6.5 2.5L4 4.5M13.5 2.5L16 4.5" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" {...common}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v2M10 15v2M17 10h-2M5 10H3M14.9 5.1l-1.4 1.4M6.5 13.5l-1.4 1.4M14.9 14.9l-1.4-1.4M6.5 6.5L5.1 5.1" />
    </svg>
  )
}
