function Button() {
  async function handleClick() {
    const response = await fetch('http://127.0.0.1:8000/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        title: 'Buy groceries',
        done: false,
      }),
    })

    const data = await response.json()
    alert('Task created: ' + data.title)
  }

  return (
    <button onClick={handleClick}>Create Task</button>
  )
}

export default Button
