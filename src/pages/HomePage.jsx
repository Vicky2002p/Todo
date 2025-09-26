import React, { useState } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './HomePage.css';

// Sortable task component
const SortableTask = ({ id, content, onUpdateTask, onDeleteTask, columnColor }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [taskContent, setTaskContent] = useState(content);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = () => {
    if (isEditing) {
      onUpdateTask(id, taskContent);
    }
    setIsEditing(!isEditing);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-item ${columnColor}-task`}
    >
      <div className="task-content">
        {isEditing ? (
          <input
            type="text"
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleEdit}
            className="task-edit-input"
            autoFocus
          />
        ) : (
          <span className="task-text">{content}</span>
        )}
      </div>
      <div className="task-actions">
        <button
          onClick={handleEdit}
          className="task-action-btn edit-btn"
        >
          {isEditing ? '✓' : '✎'}
        </button>
        <button
          onClick={() => onDeleteTask(id)}
          className="task-action-btn delete-btn"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Column component
const Column = ({ id, title, tasks, onUpdateTask, onDeleteTask, color, showAddButton = false, onAddTask }) => {
  const { setNodeRef } = useSortable({ id });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');

  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      onAddTask(newTaskContent);
      setNewTaskContent('');
      setIsAddingTask(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
    if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskContent('');
    }
  };

  return (
    <div ref={setNodeRef} className={`column ${color}-column`}>
      <div className="column-header">
        <h2 className="column-title">
          <span className="title-text">{title}</span>
          <span className="task-count">{tasks.length}</span>
        </h2>
        {showAddButton && (
          <button
            onClick={() => setIsAddingTask(true)}
            className={`add-task-btn ${color}-add-btn`}
          >
            <span className="plus-icon">+</span>
          </button>
        )}
      </div>
      
      <div className="tasks-container">
        {isAddingTask && (
          <div className="new-task-form">
            <input
              type="text"
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter new task..."
              className="new-task-input"
              autoFocus
            />
            <div className="new-task-actions">
              <button
                onClick={handleAddTask}
                className="new-task-btn save-btn"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskContent('');
                }}
                className="new-task-btn cancel-btn"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask
              key={task.id}
              id={task.id}
              content={task.content}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              columnColor={color}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAddingTask && (
          <div className="empty-state">
            <p>No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function HomePage() {
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    done: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const sourceColumn = Object.keys(tasks).find(column =>
      tasks[column].some(task => task.id === taskId)
    );
    let destinationColumn = over.id;

    if (over.id.includes('task')) {
      destinationColumn = Object.keys(tasks).find(column =>
        tasks[column].some(task => task.id === over.id)
      );
    }

    if (sourceColumn !== destinationColumn && destinationColumn) {
      setTasks(prev => {
        const sourceTasks = [...prev[sourceColumn]];
        const destinationTasks = [...prev[destinationColumn]];
        const task = sourceTasks.find(t => t.id === taskId);
        const updatedSourceTasks = sourceTasks.filter(t => t.id !== taskId);
        destinationTasks.push(task);

        return {
          ...prev,
          [sourceColumn]: updatedSourceTasks,
          [destinationColumn]: destinationTasks,
        };
      });
    }
  };

  const addTask = (content) => {
    setTasks(prev => ({
      ...prev,
      todo: [...prev.todo, { id: `task-${Date.now()}`, content }],
    }));
  };

  const updateTask = (taskId, newContent) => {
    setTasks(prev => {
      const updatedTasks = { ...prev };
      for (const column in updatedTasks) {
        updatedTasks[column] = updatedTasks[column].map(task =>
          task.id === taskId ? { ...task, content: newContent } : task
        );
      }
      return updatedTasks;
    });
  };

  const deleteTask = (taskId) => {
    setTasks(prev => {
      const updatedTasks = { ...prev };
      for (const column in updatedTasks) {
        updatedTasks[column] = updatedTasks[column].filter(task => task.id !== taskId);
      }
      return updatedTasks;
    });
  };

  return (
    <div className="homepage">
      <div className="animated-bg"></div>
      <div className="particles"></div>
      
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="app-title">
            <span className="title-glow">Todo List</span>
          </h1>
          <div className="nav-stats">
            <div className="stat-card">
              <span className="stat-number">{Object.values(tasks).flat().length}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>
        </div>
      </nav>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="columns-wrapper">
          <Column
            id="todo"
            title="TO DO"
            tasks={tasks.todo}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="red"
            showAddButton={true}
            onAddTask={addTask}
          />
          <Column
            id="inProgress"
            title="IN PROGRESS"
            tasks={tasks.inProgress}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="blue"
          />
          <Column
            id="done"
            title="COMPLETED"
            tasks={tasks.done}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="green"
          />
        </div>
      </DndContext>
    </div>
  );
}