import { useState, type SubmitEvent } from 'react';
import './TodoList.css';

interface TodoItem {
  id: string;
  text: string;
}

export function TodoList() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [draft, setDraft] = useState('');

  function handleAdd(event: SubmitEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setItems((current) => [...current, { id: crypto.randomUUID(), text }]);
    setDraft('');
  }

  function handleRemove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="todo-list">
      <form className="todo-list__form" onSubmit={handleAdd}>
        <input
          className="todo-list__input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task"
        />
        <button type="submit">Add</button>
      </form>
      <ul className="todo-list__items">
        {items.map((item) => (
          <li key={item.id} className="todo-list__item">
            <span>{item.text}</span>
            <button type="button" onClick={() => handleRemove(item.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
