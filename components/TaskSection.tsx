"use client"

import { useState, useEffect } from "react"

type Task = {
  id: string
  text: string
  done: boolean
  userId: string
  user: { id: string; name: string; initials: string }
}

export default function TaskSection({ userId }: { userId: string }) {
  const [myTasks, setMyTasks]     = useState<Task[]>([])
  const [inputs, setInputs]       = useState<string[]>([""])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(({ tasks, yesterdayUnchecked }: { tasks: Task[]; yesterdayUnchecked: { text: string }[] }) => {
        const mine = tasks.filter(t => t.userId === userId)
        setMyTasks(mine)
        if (mine.length > 0) {
          setSubmitted(true)
        } else if (yesterdayUnchecked.length > 0) {
          setInputs(yesterdayUnchecked.map(t => t.text))
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSubmit() {
    const texts = inputs.filter(t => t.trim())
    if (texts.length === 0) return
    setSaving(true)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    })
    const { tasks } = await fetch("/api/tasks").then(r => r.json())
    setMyTasks(tasks.filter((t: Task) => t.userId === userId))
    setSubmitted(true)
    setSaving(false)
  }

  async function toggleDone(task: Task) {
    const newDone = !task.done
    setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: newDone } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    })
  }

  if (loading) return null

  return (
    <section className="mt-5 bg-white rounded-2xl p-4 border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Mes tâches du jour
      </h2>

      {!submitted ? (
        <div className="space-y-2">
          {inputs.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={e => setInputs(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); setInputs(prev => [...prev, ""]) }
                }}
                placeholder="Sur quoi tu bosses ?"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
              />
              {inputs.length > 1 && (
                <button
                  onClick={() => setInputs(prev => prev.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-gray-400 text-xl leading-none"
                >×</button>
              )}
            </div>
          ))}

          <button
            onClick={() => setInputs(prev => [...prev, ""])}
            className="text-xs text-primary font-medium py-1 hover:underline"
          >
            + Ajouter une tâche
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving || inputs.every(t => !t.trim())}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform mt-1"
          >
            {saving ? "Envoi…" : "Partager mes tâches"}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {myTasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleDone(task)}
              className="flex items-center gap-3 w-full text-left group"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                task.done
                  ? "bg-success border-success"
                  : "border-gray-300 group-hover:border-primary"
              }`}>
                {task.done && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
              <span className={`text-sm transition-colors ${
                task.done ? "line-through text-gray-300" : "text-gray-700"
              }`}>
                {task.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
