import { TASK_CLOSED_STATUSES, type TaskStatus } from "@/lib/constants";

type TaskStatusLite = { status: string };

/**
 * Progresso do projeto em % inteiro:
 * tarefas DONE / tarefas não-canceladas (0 quando não há tarefas).
 */
export function projectProgress(tasks: TaskStatusLite[]): number {
  const relevant = tasks.filter((task) => task.status !== "CANCELED");
  if (relevant.length === 0) return 0;
  const done = relevant.filter((task) => task.status === "DONE").length;
  return Math.round((done / relevant.length) * 100);
}

/** Tarefas abertas = ainda não concluídas nem canceladas. */
export function countOpenTasks(tasks: TaskStatusLite[]): number {
  return tasks.filter((task) => !TASK_CLOSED_STATUSES.includes(task.status as TaskStatus)).length;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Projeto atrasado: prazo no passado e status diferente de DONE/CANCELED. */
export function isProjectOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || status === "DONE" || status === "CANCELED") return false;
  return dueDate < startOfToday();
}

/** Tarefa atrasada: prazo no passado e status aberto. */
export function isTaskOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || TASK_CLOSED_STATUSES.includes(status as TaskStatus)) return false;
  return dueDate < startOfToday();
}
