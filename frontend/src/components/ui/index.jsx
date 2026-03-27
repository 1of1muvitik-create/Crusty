import React from 'react'

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none'
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-orange-600',
    secondary: 'border border-primary text-primary hover:bg-secondary',
    outline: 'border border-gray-300 text-dark hover:bg-gray-50',
    ghost: 'text-dark hover:bg-gray-100'
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
)

export const Input = ({ label, error, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <input 
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      {...props}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
)

export const Select = ({ label, options, error, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <select 
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      {...props}
    >
      <option value="">Select an option</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
)

export const Badge = ({ variant = 'default', children }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  )
}

export const Table = ({ columns, data, loading = false }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          {columns.map(col => (
            <th key={col.key} className="px-6 py-3 font-semibold text-gray-900">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
        ) : data.length === 0 ? (
          <tr><td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">No data found</td></tr>
        ) : (
          data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)

export const Dialog = ({ open, onOpenChange, title, children, className = '' }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => onOpenChange(false)}>
      <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ${className}`} onClick={e => e.stopPropagation()}>
        {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export const Tabs = ({ tabs, defaultTab = 0 }) => {
  const [active, setActive] = React.useState(defaultTab)

  return (
    <div>
      <div className="flex border-b border-gray-200">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              active === idx
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs[active].content}
      </div>
    </div>
  )
}
