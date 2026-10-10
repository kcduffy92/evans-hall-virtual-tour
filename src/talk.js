// Who you can walk up to and chat with.
// TALKABLES: 3D roots the crosshair raycasts against (each has userData.talkId).
// PEOPLE_INFO: chat header info per talk id (ids match backend/professors.py).
// TALKING: who you're chatting with right now, read every frame by the avatars.

export const TALKABLES = new Set()

export const PEOPLE_INFO = {
  zaman: { name: 'Prof. Tauhid Zaman', course: 'MGT 409 · AI Foundations for Managers', room: 'Classroom 2200' },
  schott: { name: 'Prof. Peter Schott', course: 'MGT 407 · Statistics (EMBA)', room: 'Classroom 2210' },
}

export const TALKING = { id: null }
