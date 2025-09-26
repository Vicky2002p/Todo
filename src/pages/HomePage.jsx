import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './HomePage.css';

// Utility for formatting date
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Sortable task component
const SortableTask = React.memo(({ id, content, deadline, priority, onUpdateTask, onDeleteTask, column, completedAt, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [taskContent, setTaskContent] = useState(content);
  const [taskDeadline, setTaskDeadline] = useState(deadline ? new Date(deadline).toISOString().split('T')[0] : '');
  const [taskPriority, setTaskPriority] = useState(priority || 'Low');
  const taskRef = useRef(null);

  const setRefs = useCallback(
    (node) => {
      setNodeRef(node);
      taskRef.current = node;
    },
    [setNodeRef]
  );

  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event) => {
      if (taskRef.current && !taskRef.current.contains(event.target)) {
        // Auto-save if content is valid, otherwise revert
        if (taskContent.trim()) {
          onUpdateTask(id, {
            content: taskContent,
            deadline: taskDeadline ? new Date(taskDeadline).toISOString() : '',
            priority: taskPriority,
          });
        } else {
           setTaskContent(content);
           setTaskDeadline(deadline ? new Date(deadline).toISOString().split('T')[0] : '');
           setTaskPriority(priority || 'Low');
        }
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, id, content, deadline, priority, taskContent, taskDeadline, taskPriority, onUpdateTask]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging && !isOverlay ? 10 : 'auto',
    rotate: isDragging && !isOverlay ? '1deg' : '0deg',
  };

  const isPastDeadline = taskDeadline && new Date(taskDeadline) < new Date() && column !== 'done';
  const wasCompletedOnTime = column === 'done' && completedAt && deadline ? new Date(completedAt) <= new Date(deadline) : null;

  const handleSave = () => {
    if (taskContent.trim()) {
      onUpdateTask(id, {
        content: taskContent,
        deadline: taskDeadline ? new Date(taskDeadline).toISOString() : '',
        priority: taskPriority,
      });
      setIsEditing(false);
    }
  };

  const handleEditClick = (e) => {
    if (e) e.stopPropagation(); // Prevent click from bubbling up to the div when interacting with buttons

    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && taskContent.trim()) {
      handleSave();
    }
  };

  const handleCancel = () => {
    setTaskContent(content);
    setTaskDeadline(deadline ? new Date(deadline).toISOString().split('T')[0] : '');
    setTaskPriority(priority || 'Low');
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsEditing(false);
    onDeleteTask(id);
  };

  const togglePriority = (e) => {
    e.stopPropagation();
    const priorities = ['Low', 'Medium', 'High'];
    const nextPriority = priorities[(priorities.indexOf(taskPriority) + 1) % 3];
    setTaskPriority(nextPriority);
  };

  // Only apply drag listeners if not in editing mode
  const dragListeners = isEditing ? {} : listeners;

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...dragListeners}
      className={`task-item ${column}-task ${isPastDeadline ? 'past-deadline' : ''} ${isDragging ? 'is-dragging' : ''} ${isOverlay ? 'drag-overlay' : ''} ${isEditing ? 'is-editing' : ''}`}
      onClick={!isEditing ? handleEditClick : undefined} 
    >
      {isEditing ? (
        <div className="task-edit-form" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            onKeyDown={handleKeyPress}
            className="task-edit-input"
            placeholder="Task Description"
            autoFocus
          />
          <div className="task-edit-controls">
            <input
              type="date"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              className="task-edit-date"
              min={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={togglePriority}
              className={`task-priority-btn priority-${taskPriority.toLowerCase()}`}
            >
              {taskPriority}
            </button>
          </div>
          <div className="task-actions edit-mode-actions">
            <button onClick={handleSave} className="task-action-btn edit-btn active-save">
              ✓ Save
            </button>
            <button onClick={handleCancel} className="task-action-btn cancel-btn">
              ✕ Cancel
            </button>
            <button onClick={handleDelete} className="task-action-btn delete-btn delete-in-edit">
              🗑️
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-content">
            <span className="task-text">{content}</span>
            <div className="task-metadata">
              <span className={`task-priority priority-${priority.toLowerCase()}`}>
                {priority}
              </span>
              {deadline && (
                <span className={`task-deadline ${isPastDeadline ? 'past' : ''}`}>
                  {isPastDeadline ? '⚠ Past Due: ' : 'Due: '} {formatDate(deadline)}
                </span>
              )}
              {column === 'done' && completedAt && (
                <span className={`task-completion ${wasCompletedOnTime ? 'on-time' : 'late'}`}>
                  {wasCompletedOnTime ? '✅ On Time' : '🔴 Completed Late'}
                </span>
              )}
            </div>
          </div>
          <div className="task-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleEditClick} className="task-action-btn edit-btn">
              ✎
            </button>
            <button onClick={handleDelete} className="task-action-btn delete-btn">
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
});

// Column component
const Column = ({ id, title, tasks, onUpdateTask, onDeleteTask, color, showAddButton = false, onAddTask }) => {
  const { setNodeRef } = useSortable({ id, data: { type: 'column' } });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');
  const formRef = useRef(null);

  useEffect(() => {
    if (!isAddingTask) return;

    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        // Cancel adding task on click outside
        setIsAddingTask(false);
        setNewTaskContent('');
        setNewTaskDeadline('');
        setNewTaskPriority('Low');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddingTask]);

  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      onAddTask({
        content: newTaskContent,
        deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : '',
        priority: newTaskPriority,
      });
      setNewTaskContent('');
      setNewTaskDeadline('');
      setNewTaskPriority('Low');
      setIsAddingTask(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && newTaskContent.trim()) {
      handleAddTask();
    }
    if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskContent('');
      setNewTaskDeadline('');
      setNewTaskPriority('Low');
    }
  };

  const togglePriority = (e) => {
    e.stopPropagation();
    const priorities = ['Low', 'Medium', 'High'];
    setNewTaskPriority(priorities[(priorities.indexOf(newTaskPriority) + 1) % 3]);
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
            disabled={isAddingTask}
          >
            <span className="plus-icon">+</span>
          </button>
        )}
      </div>
      <div className="tasks-container">
        {isAddingTask && (
          <div ref={formRef} className="new-task-form">
            <input
              type="text"
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter new task description..."
              className="new-task-input"
              autoFocus
            />
            <div className="new-task-controls">
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="new-task-date"
                  min={new Date().toISOString().split('T')[0]}
                />
                <button
                  onClick={togglePriority}
                  className={`new-task-priority-btn priority-${newTaskPriority.toLowerCase()}`}
                >
                  {newTaskPriority}
                </button>
            </div>
            <div className="new-task-actions">
              <button onClick={handleAddTask} className="new-task-btn save-btn">
                ✓ Add Task
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskContent('');
                  setNewTaskDeadline('');
                  setNewTaskPriority('Low');
                }}
                className="new-task-btn cancel-btn"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              id={task.id}
              content={task.content}
              deadline={task.deadline}
              priority={task.priority}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              column={id}
              completedAt={task.completedAt}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isAddingTask && (
          <div className="empty-state">
            <p>No tasks yet. Add one above! 🚀</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function HomePage() {
  const [tasks, setTasks] = useState({
    todo: [
      { id: 'task-1', content: 'Design the new task editing UI.', deadline: new Date(Date.now() + 86400000 * 2).toISOString(), priority: 'High' },
      { id: 'task-2', content: 'Review and merge all CSS changes.', deadline: new Date(Date.now() - 86400000 * 1).toISOString(), priority: 'Medium' },
    ],
    inProgress: [
      { id: 'task-3', content: 'Implement Drag and Drop functionality.', deadline: new Date(Date.now() + 86400000 * 7).toISOString(), priority: 'High' },
    ],
    done: [
      { id: 'task-4', content: 'Set up initial React component structure.', deadline: new Date(Date.now() - 86400000 * 5).toISOString(), completedAt: new Date(Date.now() - 86400000 * 6).toISOString(), priority: 'Low' },
    ],
  });
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const findTask = (taskId) => {
    for (const column in tasks) {
      const task = tasks[column].find(t => t.id === taskId);
      if (task) return { task, column };
    }
    return null;
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id;
    const { task: movingTask, column: sourceColumn } = findTask(taskId) || {};
    if (!movingTask) return;

    let destinationColumn = over.id;

    if (over.id.includes('task')) {
      const overTaskData = findTask(over.id);
      if (overTaskData) {
        destinationColumn = overTaskData.column;
      }
    }

    if (sourceColumn !== destinationColumn && destinationColumn) {
      setTasks((prev) => {
        const sourceTasks = [...prev[sourceColumn]];
        const destinationTasks = [...prev[destinationColumn]];
        
        const updatedSourceTasks = sourceTasks.filter((t) => t.id !== taskId);
        
        let updatedTask;
        if (destinationColumn === 'done') {
            updatedTask = { ...movingTask, completedAt: new Date().toISOString() };
        } else {
            const { completedAt, ...rest } = movingTask;
            updatedTask = rest;
        }

        destinationTasks.push(updatedTask);

        return {
          ...prev,
          [sourceColumn]: updatedSourceTasks,
          [destinationColumn]: destinationTasks,
        };
      });
    }
    
    // Handle reordering within a column
    if (over.id.includes('task')) {
      const overTaskData = findTask(over.id);
      if (overTaskData && overTaskData.column === sourceColumn) {
        setTasks((prev) => {
          const items = [...prev[sourceColumn]];
          const oldIndex = items.findIndex(t => t.id === active.id);
          const newIndex = items.findIndex(t => t.id === over.id);

          if (oldIndex !== newIndex) {
            const [removed] = items.splice(oldIndex, 1);
            items.splice(newIndex, 0, removed);
            return {
              ...prev,
              [sourceColumn]: items,
            };
          }
          return prev;
        });
      }
    }
  };
  
  const activeTask = activeId ? findTask(activeId)?.task : null;

  const addTask = ({ content, deadline, priority }) => {
    setTasks((prev) => ({
      ...prev,
      todo: [{ id: `task-${Date.now()}`, content, deadline, priority }, ...prev.todo],
    }));
  };

  const updateTask = (taskId, { content, deadline, priority }) => {
    setTasks((prev) => {
      const updatedTasks = { ...prev };
      for (const column in updatedTasks) {
        updatedTasks[column] = updatedTasks[column].map((task) =>
          task.id === taskId ? { ...task, content, deadline, priority } : task
        );
      }
      return updatedTasks;
    });
  };

  const deleteTask = (taskId) => {
    setTasks((prev) => {
      const updatedTasks = { ...prev };
      for (const column in updatedTasks) {
        updatedTasks[column] = updatedTasks[column].filter((task) => task.id !== taskId);
      }
      return updatedTasks;
    });
  };
  
  const allTasks = Object.values(tasks).flat();
  const totalTasks = allTasks.length;
  const onTimeTasks = tasks.done.filter((task) => task.completedAt && task.deadline && new Date(task.completedAt) <= new Date(task.deadline)).length;

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
              <span className="stat-number">{totalTasks}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{tasks.done.length}</span>
              <span className="stat-label">Completed</span>
            </div>
             <div className="stat-card">
              <span className="stat-number">{onTimeTasks}</span>
              <span className="stat-label">On Time</span>
            </div>
          </div>
        </div>
      </nav>
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="columns-wrapper">
          <Column
            id="todo"
            title="To-Do"
            tasks={tasks.todo}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="red"
            showAddButton={true}
            onAddTask={addTask}
          />
          <Column
            id="inProgress"
            title="In Progress"
            tasks={tasks.inProgress}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="blue"
          />
          <Column
            id="done"
            title="Done"
            tasks={tasks.done}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            color="green"
          />
        </div>
        <DragOverlay>
          {activeTask ? (
            <SortableTask 
                id={activeTask.id}
                content={activeTask.content}
                deadline={activeTask.deadline}
                priority={activeTask.priority}
                column={findTask(activeTask.id)?.column}
                onUpdateTask={() => {}} 
                onDeleteTask={() => {}}
                isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}