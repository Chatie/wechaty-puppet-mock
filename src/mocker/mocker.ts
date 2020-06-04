import cuid from 'cuid'
import {
  Puppet,
  ContactPayload,
  RoomPayload,
  MessagePayload,
  ScanStatus,
}                     from 'wechaty-puppet'

import { log } from '../config'

import { MockContact }  from './mock-contact'
import { MockRoom }     from './mock-room'
import {
  generateContactPayload,
  generateRoomPayload,
}                           from './generator'
import { MockerBehavior } from './behavior'

class Mocker {

  id: string

  cacheContactPayload : Map<string, ContactPayload>
  cacheRoomPayload    : Map<string, RoomPayload>
  cacheMessagePayload : Map<string, MessagePayload>

  protected behaviorList: MockerBehavior[]
  protected behaviorCleanupFnList: (() => void)[]

  protected _puppet?: Puppet
  set puppet (puppet: Puppet) {
    if (this._puppet) {
      throw new Error('puppet has already been set before. can not be set twice.')
    }
    this._puppet = puppet
  }
  get puppet () {
    if (!this._puppet) {
      throw new Error('puppet has not been set yet, cannot be used.')
    }
    return this._puppet
  }

  constructor () {
    log.verbose('Mocker', 'constructor()')

    this.id = cuid()

    this.behaviorList          = []
    this.behaviorCleanupFnList = []

    this.cacheContactPayload = new Map()
    this.cacheRoomPayload    = new Map()
    this.cacheMessagePayload = new Map()
  }

  toString () {
    return `Mocker<${this.id}>`
  }

  use (...behaviorList: MockerBehavior[]): void {
    log.verbose('Mocker', 'use(%s)', behaviorList.length)

    this.behaviorList.push(
      ...behaviorList,
    )
  }

  start () {
    log.verbose('Mocker', 'start()')
    this.behaviorList.forEach(behavior => {
      log.verbose('Mocker', 'start() enabling behavior %s', behavior.name)
      const stop = behavior(this)
      this.behaviorCleanupFnList.push(stop)
    })
  }

  stop () {
    log.verbose('Mocker', 'stop()')
    let n = 0
    this.behaviorCleanupFnList.forEach(fn => {
      log.verbose('Mocker', 'stop() cleaning behavior #%s', n++)
      fn()
    })
    this.behaviorCleanupFnList.length = 0
  }

  randomContact (): undefined | MockContact {
    log.verbose('Mocker', 'randomContact()')

    const contactIdList = [...this.cacheContactPayload.keys()]

    if (contactIdList.length <= 0) {
      return
    }

    const index = Math.floor(contactIdList.length * Math.random())
    const id = contactIdList[index]

    const payload = this.cacheContactPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return new MockContact(this, payload)
  }

  randomRoom (): undefined | MockRoom {
    log.verbose('Mocker', 'randomRoom')

    const roomIdList = [...this.cacheRoomPayload.keys()]

    if (roomIdList.length <= 0) {
      return
    }

    const index = Math.floor(roomIdList.length * Math.random())
    const id = roomIdList[index]

    const payload = this.cacheRoomPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return new MockRoom(this, payload)
  }

  public randomConversation (): MockContact | MockRoom {
    log.verbose('Mocker', 'randomConversation()')

    const contactIdList = [...this.cacheContactPayload.keys()]
    const roomIdList    = [...this.cacheRoomPayload.keys()]

    const total = contactIdList.length + roomIdList.length
    if (total <= 0) {
      throw new Error('no conversation found: 0 contact & 0 room!')
    }

    const pickContact = contactIdList.length / total

    let conversation: undefined | MockContact | MockRoom

    if (Math.random() < pickContact) {
      conversation = this.randomContact()
    } else {  // const pickRoom = roomIdList.length / total
      conversation = this.randomRoom()
    }

    if (!conversation) {
      throw new Error('no conversation')
    }
    return conversation
  }

  /**
   *
   * Events
   *
   */
  scan (qrcode: string, status: ScanStatus = ScanStatus.Waiting) {
    this.puppet.emit('scan', { qrcode, status })
  }

  login (user: MockContact) {
    this.puppet.emit('login', { contactId: user.id })
  }

  /**
   *
   * Creators for MockContacts / MockRooms
   *
   */
  createContact (payload?: Partial<ContactPayload>): MockContact {
    log.verbose('Mocker', 'createContact(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateContactPayload()
    const normalizedPayload: ContactPayload = {
      ...defaultPayload,
      ...payload,
    }
    return new MockContact(this, normalizedPayload)
  }

  createContacts (num: number): MockContact[] {
    log.verbose('Mocker', 'createContacts(%s)', num)

    const contactList = [] as MockContact[]

    while (num--) {
      const contact = this.createContact()
      contactList.push(contact)
    }

    return contactList
  }

  createRoom (payload?: Partial<RoomPayload>): MockRoom {
    log.verbose('Mocker', 'createRoom(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateRoomPayload(...this.cacheContactPayload.keys())

    const normalizedPayload: RoomPayload = {
      ...defaultPayload,
      ...payload,
    }

    return new MockRoom(this, normalizedPayload)
  }

  createRooms (num: number): MockRoom[] {
    log.verbose('Mocker', 'createRooms(%s)', num)
    const roomList = [] as MockRoom[]

    while (num--) {
      const room = this.createRoom()
      roomList.push(room)
    }

    return roomList
  }

  /**
   *
   * Setters & Getters for Payloads
   *
   */
  contactPayload (id: string, payload: ContactPayload): void
  contactPayload (id: string): ContactPayload

  contactPayload (id: string, payload?: ContactPayload): void | ContactPayload {
    log.silly('Mocker', 'contactPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheContactPayload.set(id, payload)
      return
    }

    payload = this.cacheContactPayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

  roomPayload (id: string, payload: RoomPayload): void
  roomPayload (id: string): RoomPayload

  roomPayload (id: string, payload?: RoomPayload): void | RoomPayload {
    log.silly('Mocker', 'roomPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheRoomPayload.set(id, payload)
      return
    }

    payload = this.cacheRoomPayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

  messagePayload (id: string, payload: MessagePayload): void
  messagePayload (id: string): MessagePayload

  messagePayload (id: string, payload?: MessagePayload): void | MessagePayload {
    log.silly('Mocker', 'messagePayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheMessagePayload.set(id, payload)
      return
    }

    payload = this.cacheMessagePayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

}

export { Mocker }
