import { useState } from 'react'

export default function TaskProofModal({ task, onClose, onOpenFaceMaskStudio }) {
  if (!task) return null

  const items = task.description
    ? task.description
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : []

  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedItem = items[selectedIdx] || ''
  const normKey = selectedItem.toLowerCase()

  // Simple demo states
  const [showSubPopup, setShowSubPopup] = useState(false)
  const [btnCount, setBtnCount] = useState(0)
  const [hookNum, setHookNum] = useState(0)

  // Pop Validation Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState({})

  function validateField(name, value) {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required'
        return ''

      case 'email':
        if (!value.trim()) return 'Email is required'
        // Email format: e.g. xasdd@hhh.com
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email must be in valid format (e.g. xasdd@hhh.com)'
        }
        return ''

      case 'phone':
        if (!value.trim()) return 'Phone number is required'
        // 10 digit numbers only
        if (!/^\d{10}$/.test(value)) {
          return 'Phone number must be exactly 10 digits (numbers only)'
        }
        return ''

      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 8) return 'Password must be at least 8 characters'
        if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter'
        if (!/[A-Z]/.test(value)) return 'Must contain a capital letter'
        if (!/[0-9]/.test(value)) return 'Must contain a number'
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
          return 'Must contain a special character'
        }
        return ''

      default:
        return ''
    }
  }

  function handleFieldChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function handleValidateSubmit(e) {
    e.preventDefault()
    const errors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      password: validateField('password', formData.password),
    }
    setFormErrors(errors)

    const activeErrors = Object.entries(errors)
      .filter(([_, err]) => err !== '')
      .map(([field, err]) => `• ${field.toUpperCase()}: ${err}`)

    if (activeErrors.length > 0) {
      alert('Validation Errors:\n' + activeErrors.join('\n'))
    } else {
      alert('Success! All fields are valid:\n• Name: ' + formData.name + '\n• Email: ' + formData.email + '\n• Phone: ' + formData.phone + '\n• Password: Valid (8+ chars, upper, lower, num, special)')
      setFormData({ name: '', email: '', phone: '', password: '' })
      setFormErrors({})
    }
  }

  function renderWorkDemo() {
    // 1. Reusable button
    if (normKey.includes('reusable button') || (normKey.includes('button') && !normKey.includes('icon'))) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Test the reusable button:</p>
          <div className="flex gap-2 items-center">
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded cursor-pointer"
              onClick={() => setBtnCount((c) => c + 1)}
            >
              Reusable Button
            </button>
            <span className="text-sm text-gray-600">Clicks: {btnCount}</span>
          </div>
        </div>
      )
    }

    // 2. Popup
    if (normKey.includes('popup') || normKey.includes('modal')) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Click below to test the popup:</p>
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded cursor-pointer"
            onClick={() => setShowSubPopup(true)}
          >
            Open Popup
          </button>

          {showSubPopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-5 rounded shadow-lg w-72 text-center border">
                <h3 className="text-lg font-bold mb-2">Sample Popup</h3>
                <p className="text-sm text-gray-600 mb-4">This is a popup demonstration.</p>
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm cursor-pointer"
                  onClick={() => setShowSubPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 3. Validation / Pop Validation / Form Validation / Helper Text
    if (normKey.includes('validation') || normKey.includes('helper text')) {
      return (
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-semibold text-xs text-gray-600 uppercase">Pop Validation Form:</p>

          <form onSubmit={handleValidateSubmit} className="space-y-2">
            <div>
              <input
                className={`border p-1.5 w-full rounded text-xs ${
                  formErrors.name ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
                }`}
                placeholder="Name"
                name="name"
                value={formData.name}
                onChange={handleFieldChange}
              />
              {formErrors.name && (
                <p className="text-red-500 text-[11px] mt-0.5">{formErrors.name}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-1.5 w-full rounded text-xs ${
                  formErrors.email ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
                }`}
                placeholder="Email (e.g. xasdd@hhh.com)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFieldChange}
              />
              {formErrors.email && (
                <p className="text-red-500 text-[11px] mt-0.5">{formErrors.email}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-1.5 w-full rounded text-xs ${
                  formErrors.phone ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
                }`}
                placeholder="Phone No (10 digits only)"
                name="phone"
                maxLength={10}
                value={formData.phone}
                onChange={handleFieldChange}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-[11px] mt-0.5">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <input
                className={`border p-1.5 w-full rounded text-xs ${
                  formErrors.password ? 'border-red-500 bg-red-50/30' : 'border-gray-300'
                }`}
                placeholder="Password (8+ chars, Upper, Lower, Num, Special)"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleFieldChange}
              />
              {formErrors.password && (
                <p className="text-red-500 text-[11px] mt-0.5">{formErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-1.5 rounded text-xs font-medium cursor-pointer mt-1"
            >
              Validate & Submit
            </button>
          </form>
        </div>
      )
    }

    // 4. React structure
    if (normKey.includes('react structure') || normKey.includes('structure')) {
      return (
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold mb-2">React Structure:</p>
          <div className="border p-2 bg-gray-50 font-mono text-xs text-gray-800">
            <div>• src/</div>
            <div className="pl-4">├── App.jsx (Task Manager Table & Form)</div>
            <div className="pl-4">├── components/ (Button.jsx, TaskProofModal.jsx)</div>
            <div className="pl-4">├── index.css & App.css</div>
            <div className="pl-4">└── main.jsx</div>
            <div>• backend/</div>
            <div className="pl-4">├── main.py (FastAPI Server & Mongo)</div>
            <div className="pl-4">└── run.bat</div>
          </div>
        </div>
      )
    }

    // 5. FastAPI / Backend
    if (normKey.includes('fastapi') || normKey.includes('backend')) {
      return (
        <div className="text-sm text-gray-700 space-y-2">
          <p className="font-semibold">FastAPI Endpoints:</p>
          <ul className="list-disc pl-5 text-xs space-y-1">
            <li>GET /tasks - Fetch all tasks</li>
            <li>POST /tasks - Create new task</li>
            <li>PUT /tasks/:id - Update task</li>
            <li>DELETE /tasks/:id - Delete task</li>
          </ul>
        </div>
      )
    }

    // 6. React hooks
    if (normKey.includes('react hook') || normKey.includes('hook')) {
      return (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Test useState Hook (Counter):</p>
          <div className="flex items-center gap-2">
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded cursor-pointer"
              onClick={() => setHookNum((n) => n - 1)}
            >
              -
            </button>
            <span className="font-bold px-2">{hookNum}</span>
            <button
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded cursor-pointer"
              onClick={() => setHookNum((n) => n + 1)}
            >
              +
            </button>
          </div>
        </div>
      )
    }

    // 7. Table (crud) / Crud operations
    if (normKey.includes('crud') || normKey.includes('table')) {
      return (
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold">CRUD Operations:</p>
          <p className="text-xs">1. Create: Add button opens modal to add task</p>
          <p className="text-xs">2. Read: Table displays all tasks from DB</p>
          <p className="text-xs">3. Update: Edit icon opens modal with task data</p>
          <p className="text-xs">4. Delete: Trash icon removes task from DB</p>
        </div>
      )
    }

    // 8. MongoDB Atlas
    if (normKey.includes('mongodb') || normKey.includes('atlas')) {
      return (
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold">MongoDB Atlas Details:</p>
          <p className="text-xs">Cluster: cluster0.fgxk479.mongodb.net</p>
          <p className="text-xs">Database: taskdb</p>
          <p className="text-xs">Collection: tasks</p>
        </div>
      )
    }

    // 9. Flexbox / CSS
    if (normKey.includes('flexbox') || normKey.includes('css')) {
      return (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Flexbox layout demonstration:</p>
          <div className="flex justify-between border p-2 rounded bg-gray-100 text-xs">
            <div className="bg-gray-400 text-white px-2 py-1 rounded">Item 1</div>
            <div className="bg-gray-500 text-white px-2 py-1 rounded">Item 2</div>
            <div className="bg-gray-600 text-white px-2 py-1 rounded">Item 3</div>
          </div>
        </div>
      )
    }

    // 10. Button to icon
    if (normKey.includes('button to icon') || normKey.includes('icon')) {
      return (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Action buttons converted to Lucide icons:</p>
          <div className="flex gap-2">
            <button className="bg-gray-500 text-white p-2 rounded">View</button>
            <button className="bg-gray-500 text-white p-2 rounded">Edit</button>
            <button className="bg-gray-500 text-white p-2 rounded">Delete</button>
          </div>
        </div>
      )
    }

    // 11. NSSM services
    if (normKey.includes('nssm') || normKey.includes('service')) {
      return (
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold">NSSM Service Details:</p>
          <p className="text-xs">Runs uvicorn backend on port 8000</p>
          <p className="text-xs">Log file: backend/logs/service.log</p>
        </div>
      )
    }

    // 12. Face mask detection / AI Model
    if (
      normKey.includes('face mask') ||
      normKey.includes('mask') ||
      normKey.includes('face_mask') ||
      normKey.includes('ai model') ||
      normKey.includes('detection')
    ) {
      return (
        <div className="space-y-3 text-sm text-gray-700">
          <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-xs text-indigo-900">
            <p className="font-bold mb-1">AI Model Training — Face Mask Detection</p>
            <p className="text-gray-600">
              PyTorch CNN + OpenCV Haar Cascade detector trained on 24.09.2026 with real-time camera capture & image upload.
            </p>
          </div>
          <button
            onClick={() => {
              if (onOpenFaceMaskStudio) {
                onClose?.()
                onOpenFaceMaskStudio(task)
              }
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md"
          >
            <span>Open Detection Studio (New Page)</span>
          </button>
        </div>
      )
    }

    // Default
    return (
      <div className="text-sm text-gray-700">
        <p>Work done for: <strong>{selectedItem}</strong></p>
        <p className="text-xs text-gray-500 mt-1">Status: {task.status}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-96 max-w-full border max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-3">{task.type}</h2>

        {/* List of description items */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Description items:</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, idx) => {
              const isSelected = idx === selectedIdx
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${
                    isSelected
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected item work demo */}
        <div className="border p-3 rounded mb-4 bg-gray-50 min-h-[90px]">
          {renderWorkDemo()}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end">
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
