/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import path  from 'path'

import {
  ContactGender,
  ContactPayload,
  ContactType,

  FileBox,

  FriendshipPayload,

  ImageType,

  MessagePayload,
  MessageType,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
  MiniProgramPayload,
}                           from 'wechaty-puppet'

import {
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  log,
  qrCodeForChatie,
  VERSION,
}                                   from './config'

export interface MockContactRawPayload {
  name : string,
}

export interface MockMessageRawPayload {
  id   : string,
  from : string,
  to   : string,
  text : string
}

export interface MockRoomRawPayload {
  topic      : string,
  memberList : string[],
  ownerId    : string,
}

export class PuppetMock extends Puppet {

  public static readonly VERSION = VERSION

  private loopTimer?: NodeJS.Timer

  constructor (
    public options: PuppetOptions = {},
  ) {
    super(options)
  }

  public async start (): Promise<void> {
    log.verbose('PuppetMock', `start()`)

    if (this.state.on()) {
      log.warn('PuppetMock', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')
    // await some tasks...
    this.state.on(true)

    this.emit('scan', { qrcode: 'https://not-exist.com', status: 0 })

    this.id = 'logined_user_id'
    // const user = this.Contact.load(this.id)
    this.emit('login', { contactId: this.id })

    let counter = 0
    const sendMockMessage = () => {
      const MOCK_MSG_ID = 'mockid' + counter++

      this.cacheMessagePayload.set(MOCK_MSG_ID, {
        fromId        : 'xxx',
        id            : MOCK_MSG_ID,
        mentionIdList : [],
        text          : 'mock text',
        timestamp     : Date.now(),
        toId          : 'xxx',
        type          : MessageType.Text,
      })

      log.verbose('PuppetMock', `start() setInterval() pretending received a new message: ${MOCK_MSG_ID}`)
      this.emit('message', { messageId: MOCK_MSG_ID })
    }

    this.loopTimer = setInterval(sendMockMessage, 5000)
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetMock', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetMock', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    if (this.loopTimer) {
      clearInterval(this.loopTimer)
    }

    // await some tasks...
    this.state.off(true)
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetMock', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', { contactId: this.id, data: 'test' }) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
  }

  public ding (data?: string): void {
    log.silly('PuppetMock', 'ding(%s)', data || '')
    this.emit('dong', { data: data || '' })
  }

  public unref (): void {
    log.verbose('PuppetMock', 'unref()')
    super.unref()
    if (this.loopTimer) {
      this.loopTimer.unref()
    }
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  public async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetMock', 'contactSelfQRCode()')
    return CHATIE_OFFICIAL_ACCOUNT_QRCODE
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfName(%s)', name)
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetMock', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetMock', 'contactList()')

    return []
  }

  public async contactQRCode (contactId: string): Promise<string> {
    log.verbose('PuppetMock', 'contactQRCode(%s)', contactId)
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetMock', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromFile(WECHATY_ICON_PNG)
  }

  public async contactRawPayload (id: string): Promise<MockContactRawPayload> {
    log.verbose('PuppetMock', 'contactRawPayload(%s)', id)
    const rawPayload: MockContactRawPayload = {
      name : 'mock name',
    }
    return rawPayload
  }

  public async contactRawPayloadParser (rawPayload: MockContactRawPayload): Promise<ContactPayload> {
    log.verbose('PuppetMock', 'contactRawPayloadParser(%s)', rawPayload)

    const payload: ContactPayload = {
      avatar : 'mock-avatar-data',
      gender : ContactGender.Unknown,
      id     : 'id',
      name   : 'mock-name',
      type   : ContactType.Unknown,
    }
    return payload
  }

  /**
   *
   * Message
   *
   */
  public async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'messageContact(%s)', messageId)
    return 'fake-id'
  }

  public async messageImage (
    messageId: string,
    imageType: ImageType,
  ) : Promise<FileBox> {
    log.verbose('PuppetMock', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )
    return FileBox.fromQRCode('fake-qrcode')
  }

  public async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetMock', 'messageRecall(%s)', messageId)
    return false
  }

  public async messageFile (id: string): Promise<FileBox> {
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'mock-file' + id + '.txt',
    )
  }

  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetMock', 'messageUrl(%s)')

    return {
      title : 'mock title for ' + messageId,
      url   : 'https://mock.url',
    }
  }

  public async messageMiniProgram (messageId: string): Promise<MiniProgramPayload> {
    log.verbose('PuppetMock', 'messageMiniProgram(%s)', messageId)

    return {
      title : 'mock title for ' + messageId,
    }
  }

  public async messageRawPayload (id: string): Promise<MockMessageRawPayload> {
    log.verbose('PuppetMock', 'messageRawPayload(%s)', id)
    const rawPayload: MockMessageRawPayload = {
      from : 'from_id',
      id   : 'id',
      text : 'mock message text',
      to   : 'to_id',
    }
    return rawPayload
  }

  public async messageRawPayloadParser (rawPayload: MockMessageRawPayload): Promise<MessagePayload> {
    log.verbose('PuppetMock', 'messagePayload(%s)', rawPayload)
    const payload: MessagePayload = {
      fromId        : 'xxx',
      id            : rawPayload.id,
      mentionIdList : [],
      text          : 'mock message text',
      timestamp     : Date.now(),
      toId          : this.selfId(),
      type          : MessageType.Text,
    }
    return payload
  }

  public async messageSendText (
    conversationId: string,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', conversationId, text)
  }

  public async messageSendFile (
    conversationId: string,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', conversationId, file)
  }

  public async messageSendContact (
    conversationId: string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend("%s", %s)', conversationId, contactId)
  }

  public async messageSendUrl (conversationId: string, urlLinkPayload: UrlLinkPayload) : Promise<void> {
    log.verbose('PuppetMock', 'messageSendUrl("%s", %s)',
      conversationId,
      JSON.stringify(urlLinkPayload),
    )
  }
  public async messageSendMiniProgram (conversationId: string, miniProgramPayload: MiniProgramPayload): Promise<void> {
    log.verbose('PuppetMock', 'messageSendMiniProgram("%s", %s)',
      conversationId,
      JSON.stringify(miniProgramPayload),
    )
  }

  public async messageForward (
    conversationId: string,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload (
    id: string,
  ): Promise<MockRoomRawPayload> {
    log.verbose('PuppetMock', 'roomRawPayload(%s)', id)

    const rawPayload: MockRoomRawPayload = {
      memberList: [],
      ownerId   : 'mock_room_owner_id',
      topic     : 'mock topic',
    }
    return rawPayload
  }

  public async roomRawPayloadParser (
    rawPayload: MockRoomRawPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetMock', 'roomRawPayloadParser(%s)', rawPayload)

    const payload: RoomPayload = {
      adminIdList  : [],
      id           : 'id',
      memberIdList : [],
      topic        : 'mock topic',
    }

    return payload
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetMock', 'roomList()')

    return []
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetMock', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetMock', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', roomId)
  }

  public async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetMock', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetMock', 'roommemberList(%s)', roomId)
    return []
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<any>  {
    log.verbose('PuppetMock', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {}
  }

  public async roomMemberRawPayloadParser (rawPayload: any): Promise<RoomMemberPayload>  {
    log.verbose('PuppetMock', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  /**
   *
   * Room Invitation
   *
   */
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetMock', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetMock', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }
  public async friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload> {
    return rawPayload
  }

  public async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  public async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendshipAccept(%s)', friendshipId)
  }

  /**
   *
   * Tag
   *
   */
  public async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactAdd(%s)', tagId, contactId)
  }

  public async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactRemove(%s)', tagId, contactId)
  }

  public async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactDelete(%s)', tagId)
  }

  public async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetMock', 'tagContactList(%s)', contactId)
    return []
  }

}

export default PuppetMock
