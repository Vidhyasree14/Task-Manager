import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import TaskProofModal from './components/TaskProofModal'
import FaceMaskDetectionPage from './pages/FaceMaskDetectionPage'

function App() {
  const [tasks, setTasks] = useState([])
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('start')
  const [date, setDate] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewingTask, setViewingTask] = useState(null)
  const [errors, setErrors] = useState({})

  // Multi-page navigation state
  const [currentPage, setCurrentPage] = useState(() => {
    return window.location.hash === '#face-mask-detection' ? 'face-mask-detection' : 'tasks'
  })
  const [selectedFaceTask, setSelectedFaceTask] = useState(null)

  const API_BASE = window.location.port === '5173' ? 'http://127.0.0.1:8000' : ''

  // Sync with browser URL hash
  useEffect(() => {
    function handleHashChange() {
      if (window.location.hash === '#face-mask-detection') {
        setCurrentPage('face-mask-detection')
      } else {
        setCurrentPage('tasks')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function loadTasks() {
    const url = filter
      ? `${API_BASE}/tasks?status=${filter}`
      : `${API_BASE}/tasks`

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setTasks(data)
      })
      .catch((err) => {
        console.error('Failed to load tasks:', err)
      })
  }

  useEffect(() => {
    loadTasks()
  }, [filter])

  function isFaceMaskTask(task) {
    if (!task) return false
    const t = (task.type || '').toLowerCase()
    const d = (task.description || '').toLowerCase()
    const dt = task.date || ''
    return (
      dt === '2026-09-24' ||
      d.includes('face mask') ||
      d.includes('face_mask') ||
      t.includes('ai model')
    )
  }

  function handleViewClick(task) {
    if (isFaceMaskTask(task)) {
      setSelectedFaceTask(task)
      setCurrentPage('face-mask-detection')
      window.location.hash = '#face-mask-detection'
    } else {
      setViewingTask(task)
    }
  }

  function resetForm() {
    setEditingId(null)
    setType('')
    setDescription('')
    setStatus('start')
    setDate('')
    setErrors({})
  }

  function validateField(name, value) {
    switch (name) {
      case 'type':
        return value.trim() === '' ? 'Type is required' : ''
      case 'description':
        if (value.trim() === '') return 'Description is required'
        if (value.trim().length < 5) return 'Description must be at least 5 characters'
        return ''
      case 'status':
        return value === '' ? 'Please select a status' : ''
      case 'date':
        return value === '' ? 'Date is required' : ''
      default:
        return ''
    }
  }

  function handleFieldChange(name, value, setter) {
    setter(value)
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function handleSave() {
    const newErrors = {
      type: validateField('type', type),
      description: validateField('description', description),
      status: validateField('status', status),
      date: validateField('date', date),
    }
    setErrors(newErrors)

    const hasError = Object.values(newErrors).some((err) => err !== '')
    if (hasError) {
      return
    }

    if (editingId) {
      const updatedTask = { id: editingId, type, description, status, date }

      fetch(`${API_BASE}/tasks/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      }).then(() => {
        alert('Task updated')
        resetForm()
        setShowModal(false)
        loadTasks()
      })
    } else {
      const newTask = { id: Date.now(), type, description, status, date }

      fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      }).then(() => {
        alert('Task added')
        resetForm()
        setShowModal(false)
        loadTasks()
      })
    }
  }

  function handleEditClick(task) {
    setEditingId(task.id)
    setType(task.type)
    setDescription(task.description)
    setStatus(task.status)
    setDate(task.date)
    setErrors({})
    setShowModal(true)
  }

  function handleDelete(id) {
    fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    }).then(() => {
      loadTasks()
    })
  }

  // IF CURRENT PAGE IS FACE MASK DETECTION -> RENDER DEDICATED NEW PAGE
  if (currentPage === 'face-mask-detection') {
    return (
      <FaceMaskDetectionPage
        initialTask={selectedFaceTask}
        onBack={() => {
          setCurrentPage('tasks')
          window.location.hash = ''
        }}
      />
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="mb-6 pb-4 border-b border-gray-200 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-blue-600 m-0">Task Manager</h1>
        <p className="text-xs text-gray-500 mt-1">Track sprint tasks, deliverables, and AI model tests</p>
      </div>

      <div className="flex justify-center mt-5">
        <table className="border-collapse border w-full max-w-4xl shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2.5 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="border p-2.5 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="border p-2.5 text-left text-sm font-semibold text-gray-700">
                <select
                  className="p-1 text-sm font-normal outline-none focus:outline-none bg-transparent cursor-pointer"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Status</option>
                  <option value="start">Start</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </th>
              <th className="border p-2.5 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="border p-2.5 text-center text-sm font-semibold text-gray-700">
                Action
                <button
                  className="text-red-500 ml-2 cursor-pointer hover:scale-110 transition inline-block align-middle"
                  title="Add new task"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={20} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isAiTask = isFaceMaskTask(task)
              return (
                <tr
                  key={task.id}
                  className={`hover:bg-gray-50/80 transition ${
                    isAiTask ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="border p-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      {isAiTask && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      )}
                      <span className={isAiTask ? 'font-semibold text-indigo-900' : ''}>
                        {task.type}
                      </span>
                    </div>
                  </td>
                  <td className="border p-2 text-sm">
                    {task.description}
                    {isAiTask && (
                      <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                        AI Vision
                      </span>
                    )}
                  </td>
                  <td className="border p-2 text-sm">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : task.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="border p-2 text-sm font-mono text-gray-600">{task.date}</td>
                  <td className="border p-2 text-center">
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded mr-1 cursor-pointer transition"
                      title={
                        isAiTask
                          ? 'Open AI Face Mask Detection Studio'
                          : 'View Task Proof'
                      }
                      onClick={() => handleViewClick(task)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded mr-1 cursor-pointer transition"
                      onClick={() => handleEditClick(task)}
                      title="Edit task"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded cursor-pointer transition"
                      onClick={() => handleDelete(task.id)}
                      title="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Update Task' : 'Add Task'}
            </h2>

            <input
              className="border p-2 w-full mb-1 rounded text-sm"
              placeholder="Type"
              value={type}
              onChange={(e) => handleFieldChange('type', e.target.value, setType)}
            />
            {errors.type && (
              <p className="text-left text-red-500 text-xs mb-2">{errors.type}</p>
            )}

            <input
              className="border p-2 w-full mb-1 rounded text-sm"
              placeholder="Description"
              value={description}
              onChange={(e) => handleFieldChange('description', e.target.value, setDescription)}
            />
            {errors.description && (
              <p className="text-left text-red-500 text-xs mb-2">{errors.description}</p>
            )}

            <select
              className="border p-2 w-full mb-1 rounded text-sm"
              value={status}
              onChange={(e) => handleFieldChange('status', e.target.value, setStatus)}
            >
              <option value="start">Start</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && (
              <p className="text-left text-red-500 text-xs mb-2">{errors.status}</p>
            )}

            <input
              className="border p-2 w-full mb-1 rounded text-sm"
              type="date"
              value={date}
              onChange={(e) => handleFieldChange('date', e.target.value, setDate)}
            />
            {errors.date && (
              <p className="text-left text-red-500 text-xs mb-4">{errors.date}</p>
            )}
            {!errors.date && <div className="mb-4" />}

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded text-sm cursor-pointer"
                onClick={() => {
                  resetForm()
                  setShowModal(false)
                }}
              >
                Cancel
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm cursor-pointer"
                onClick={handleSave}
              >
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Proof Modal */}
      {viewingTask && (
        <TaskProofModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onOpenFaceMaskStudio={(task) => {
            setSelectedFaceTask(task)
            setViewingTask(null)
            setCurrentPage('face-mask-detection')
            window.location.hash = '#face-mask-detection'
          }}
        />
      )}
    </div>
  )
}

export default App