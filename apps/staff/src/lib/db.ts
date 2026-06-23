import Dexie, { type Table } from 'dexie'

interface PendingAction {
  id?: number
  type: string
  payload: any
  createdAt: Date
  retries: number
}

interface CachedOrder {
  id: string
  branchId: string
  data: any
  updatedAt: Date
}

class StaffDatabase extends Dexie {
  pendingActions!: Table<PendingAction, number>
  cachedOrders!: Table<CachedOrder, string>

  constructor() {
    super('staff-db')
    this.version(1).stores({
      pendingActions: '++id, type, createdAt',
      cachedOrders: 'id, branchId, updatedAt',
    })
  }
}

export const db = new StaffDatabase()

export async function queueAction(type: string, payload: any) {
  await db.pendingActions.add({ type, payload, createdAt: new Date(), retries: 0 })
}

export async function syncPendingActions(apiUrl: string, token: string) {
  const pending = await db.pendingActions.orderBy('createdAt').toArray()
  for (const action of pending) {
    try {
      await fetch(`${apiUrl}/${action.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(action.payload),
      })
      await db.pendingActions.delete(action.id!)
    } catch {
      await db.pendingActions.update(action.id!, { retries: action.retries + 1 })
    }
  }
}
