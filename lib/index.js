/**
 * @license
 * Copyright (c) 2020 UMI
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict'

/**
 * Базовый класс для работы с транзакциями.
 * @class
 */
class Transaction {
  /**
   * @param {Uint8Array} [bytes] Транзакция в бинарном виде, 150 байт.
   * @throws {Error}
   */
  constructor (bytes) {
    /**
     * Транзакция в бинарном виде.
     * @type {Uint8Array}
     * @private
     */
    this._bytes = new Uint8Array(Transaction.LENGTH)
    /**
     * Транзакция в бинарном виде.
     * @type {DataView}
     * @private
     */
    this._view = new DataView(this._bytes.buffer)
    /**
     * Заполоненные свойства.
     * @type {Object}
     * @private
     */
    this._fieldsMap = {}
    if (bytes !== undefined) {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('bytes type must be Uint8Array')
      }
      if (bytes.byteLength !== Transaction.LENGTH) {
        throw new Error('bytes length must be 150 bytes')
      }
      this._bytes.set(bytes)
      this._setFields([
        'version', 'sender', 'recipient', 'value', 'prefix',
        'name', 'profitPercent', 'feePercent', 'nonce', 'signature'
      ])
    }
  }

  /**
   * Длина транзакции в байтах.
   * @type {number}
   * @constant
   */
  static get LENGTH () { return 150 }
  /**
   * Genesis-транзакция.
   * Может быть добавлена только в Genesis-блок.
   * Адрес отправителя должен иметь префикс genesis, адрес получаетеля - umi.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('genesis')
   * let recipient = Address.fromKey(secKey).setPrefix('umi')
   * let tx = new Transaction().
   *   setVersion(Transaction.Genesis).
   *   setSender(sender).
   *   setRecipient(recipient).
   *   setValue(42).
   *   sign(secKey)
   */
  static get Genesis () { return 0 }
  /**
   * Стандартная транзакция. Перевод монет из одного кошелька в другой.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let recipient = Address.fromKey(secKey).setPrefix('aaa')
   * let tx = new Transaction().
   *   setVersion(Transaction.Basic).
   *   setSender(sender).
   *   setRecipient(recipient).
   *   setValue(42).
   *   sign(secKey)
   */
  static get Basic () { return 1 }
  /**
   * Создание новой структуры.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let tx = new Transaction().
   *   setVersion(Transaction.CreateStructure).
   *   setSender(sender).
   *   setPrefix('aaa').
   *   setName('🙂').
   *   setProfitPercent(100).
   *   setFeePercent(0).
   *   sign(secKey)
   */
  static get CreateStructure () { return 2 }
  /**
   * Обновление настроек существующей структуры.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let tx = new Transaction().
   *   setVersion(Transaction.UpdateStructure).
   *   setSender(sender).
   *   setPrefix('aaa').
   *   setName('🙂').
   *   setProfitPercent(500).
   *   setFeePercent(2000).
   *   sign(secKey)
   */
  static get UpdateStructure () { return 3 }
  /**
   * Изменение адреса для начисления профита.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let newPrf = Address.fromBech32('aaa18d4z00xwk6jz6c4r4rgz5mcdwdjny9thrh3y8f36cpy2rz6emg5svsuw66')
   * let tx = new Transaction().
   *   setVersion(Transaction.UpdateProfitAddress).
   *   setSender(sender).
   *   setRecipient(newPrf).
   *   sign(secKey)
   */
  static get UpdateProfitAddress () { return 4 }
  /**
   * Изменение адреса на который переводоится комиссия.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let newFee = Address.fromBech32('aaa18d4z00xwk6jz6c4r4rgz5mcdwdjny9thrh3y8f36cpy2rz6emg5svsuw66')
   * let tx = new Transaction().
   *   setVersion(Transaction.UpdateFeeAddress).
   *   setSender(sender).
   *   setRecipient(newFee).
   *   sign(secKey)
   */
  static get UpdateFeeAddress () { return 5 }
  /**
   * Активация транзитного адреса.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let transit = Address.fromBech32('aaa18d4z00xwk6jz6c4r4rgz5mcdwdjny9thrh3y8f36cpy2rz6emg5svsuw66')
   * let tx = new Transaction().
   *   setVersion(Transaction.CreateTransitAddress).
   *   setSender(sender).
   *   setRecipient(transit).
   *   sign(secKey)
   */
  static get CreateTransitAddress () { return 6 }
  /**
   * Деактивация транзитного адреса.
   * @type {number}
   * @constant
   * @example
   * let secKey = SecretKey.fromSeed(new Uint8Array(32))
   * let sender = Address.fromKey(secKey).setPrefix('umi')
   * let transit = Address.fromBech32('aaa18d4z00xwk6jz6c4r4rgz5mcdwdjny9thrh3y8f36cpy2rz6emg5svsuw66')
   * let tx = new Transaction().
   *   setVersion(Transaction.DeleteTransitAddress).
   *   setSender(sender).
   *   setRecipient(transit).
   *   sign(secKey)
   */
  static get DeleteTransitAddress () { return 7 }
  /**
   * Проверить наличие свойства.
   * @param {string[]} fields
   * @throws {Error}
   * @private
   */
  _checkFields (fields) {
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(this._fieldsMap, field)) {
        throw new Error(`${field} must be set`)
      }
    }
  }

  /**
   * Отметить свойство как установленное.
   * @param {string[]} fields
   * @private
   */
  _setFields (fields) {
    for (const field of fields) {
      this._fieldsMap[field] = true
    }
  }

  /**
   * Транзакция в бинарном виде, 150 байт.
   * @type {Uint8Array}
   * @readonly
   */
  get bytes () {
    const b = new Uint8Array(this._bytes.byteLength)
    b.set(this._bytes)
    return b
  }

  /**
   * Хэш транзакции, sha256 от всех 150 байт.
   * @type {Uint8Array}
   * @readonly
   */
  get hash () {
    return sha256(this._bytes)
  }

  /**
   * Версия (тип) транзакции.
   * Обязательное поле, необходимо задать сразу после создания новой транзакции.
   * Изменять тип транзакции, после того как он был задан, нельзя.
   * @type {number}
   * @throws {Error}
   * @see Transaction.Genesis
   * @see Transaction.Basic
   * @see Transaction.CreateStructure
   * @see Transaction.UpdateStructure
   * @see Transaction.UpdateProfitAddress
   * @see Transaction.UpdateFeeAddress
   * @see Transaction.CreateTransitAddress
   * @see Transaction.DeleteTransitAddress
   */
  get version () {
    this._checkFields(['version'])
    return this._bytes[0]
  }

  set version (version) {
    if (Object.prototype.hasOwnProperty.call(this._fieldsMap, 'version')) {
      throw new Error('could not update version')
    }
    if (typeof version !== 'number') {
      throw new Error('version type must be number')
    }
    if (Math.floor(version) !== version) {
      throw new Error('version type must be integer')
    }
    if (version < Transaction.Genesis ||
      version > Transaction.DeleteTransitAddress) {
      throw new Error('incorrect version')
    }
    this._bytes[0] = version
    this._setFields(['version'])
  }

  /**
   * Устанавливает версию и возвращяет this.
   * @param {number} version Версия адреса.
   * @returns {Transaction}
   * @throws {Error}
   * @see Transaction.Genesis
   * @see Transaction.Basic
   * @see Transaction.CreateStructure
   * @see Transaction.UpdateStructure
   * @see Transaction.UpdateProfitAddress
   * @see Transaction.UpdateFeeAddress
   * @see Transaction.CreateTransitAddress
   * @see Transaction.DeleteTransitAddress
   */
  setVersion (version) {
    this.version = version
    return this
  }

  /**
   * Отправитель. Доступно для всех типов транзакций.
   * @type {Address}
   * @throws {Error}
   */
  get sender () {
    this._checkFields(['sender'])
    return new Address(this._bytes.subarray(1, 35))
  }

  set sender (address) {
    this._checkFields(['version'])
    if (!(address instanceof Address)) {
      throw new Error('address type must be Address')
    }
    if (this.version === Transaction.Genesis &&
      address.version !== Address.Genesis) {
      throw new Error('address version must be genesis')
    }
    if (this.version !== Transaction.Genesis &&
      address.version === Address.Genesis) {
      throw new Error('address version must not be genesis')
    }
    this._bytes.set(address.bytes, 1)
    this._setFields(['sender'])
  }

  /**
   * Устанавливает отправителя и возвращяет this.
   * @param {Address} address Адрес получателя.
   * @returns {Transaction}
   * @throws {Error}
   */
  setSender (address) {
    this.sender = address
    return this
  }

  /**
   * Получатель.
   * Недоступно для транзакций CreateStructure и UpdateStructure.
   * @type {Address}
   * @throws {Error}
   */
  get recipient () {
    this._checkFields(['version'])
    if (this.version === Transaction.CreateStructure ||
      this.version === Transaction.UpdateStructure) {
      throw new Error('recipient unavailable for this transaction type')
    }
    this._checkFields(['recipient'])
    return new Address(this._bytes.subarray(35, 69))
  }

  set recipient (address) {
    this._checkFields(['version'])
    if (this.version === Transaction.CreateStructure ||
      this.version === Transaction.UpdateStructure) {
      throw new Error('recipient unavailable for this transaction type')
    }
    if (!(address instanceof Address)) {
      throw new Error('recipient type must be Address')
    }
    if (address.version === Address.Genesis) {
      throw new Error('recipient version must not be genesis')
    }
    if (this.version === Transaction.Genesis &&
      address.version !== Address.Umi) {
      throw new Error('recipient version must be umi')
    }
    if (this.version !== Transaction.Genesis &&
      this.version !== Transaction.Basic &&
      address.version === Address.Umi) {
      throw new Error('recipient version must not be umi')
    }
    this._bytes.set(address.bytes, 35)
    this._setFields(['recipient'])
  }

  /**
   * Устанавливает получателя и возвращяет this.
   * Доступно для всех типов транзакций кроме CreateStructure и UpdateStructure.
   * @param {Address} address Адрес получателя.
   * @returns {Transaction}
   * @throws {Error}
   */
  setRecipient (address) {
    this.recipient = address
    return this
  }

  /**
   * Сумма перевода в UMI-центах, цело число в промежутке от 1 до 18446744073709551615.
   * Из-за ограничений JavaScript максимальное доступное значение 9007199254740991.
   * Доступно только для Genesis и Basic транзакций.
   * @type {number}
   * @throws {Error}
   */
  get value () {
    this._checkFields(['version'])
    if (this.version !== Transaction.Genesis &&
      this.version !== Transaction.Basic) {
      throw new Error('value unavailable for this transaction type')
    }
    this._checkFields(['value'])
    if (this._view.getUint16(69) > 0x001f) {
      throw new Error('value is not safe integer')
    }
    return this._view.getUint32(69) * 4294967296 +
      this._view.getUint32(69 + 4)
  }

  set value (value) {
    this._checkFields(['version'])
    if (this.version !== Transaction.Genesis &&
      this.version !== Transaction.Basic) {
      throw new Error('value unavailable for this transaction type')
    }
    if (typeof value !== 'number') {
      throw new Error('value must be number')
    }
    if (Math.floor(value) !== value) {
      throw new Error('value must be integer')
    }
    if (value < 1 || value > 9007199254740991) {
      throw new Error('value must be between 1 and 9007199254740991')
    }
    this._view.setInt32(69 + 4, value | 0)
    this._view.setInt32(69, (value - this._view.getUint32(69 + 4)) / 4294967296)
    this._setFields(['value'])
  }

  /**
   * Устанавливает сумму и возвращяет this.
   * Принимает значения в промежутке от 1 до 9007199254740991.
   * Доступно только для Genesis и Basic транзакций.
   * @param {number} value
   * @returns {Transaction}
   * @throws {Error}
   */
  setValue (value) {
    this.value = value
    return this
  }

  /**
   * Префикс адресов, принадлежащих структуре.
   * Доступно только для CreateStructure и UpdateStructure.
   * @type {string}
   * @throws {Error}
   */
  get prefix () {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('prefix unavailable for this transaction type')
    }
    this._checkFields(['prefix'])
    return versionToPrefix(this._view.getUint16(35))
  }

  set prefix (prefix) {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('prefix unavailable for this transaction type')
    }
    this._view.setUint16(35, prefixToVersion(prefix))
    this._setFields(['prefix'])
  }

  /**
   * Устанавливает префикс и возвращяет this.
   * Доступно только для CreateStructure и UpdateStructure.
   * @param {string} prefix Префикс адресов, принадлежащих структуре.
   * @returns {Transaction}
   * @throws {Error}
   */
  setPrefix (prefix) {
    this.prefix = prefix
    return this
  }

  /**
   * Название структуры в кодировке UTF-8.
   * Доступно только для CreateStructure и UpdateStructure.
   * @type {string}
   * @throws {Error}
   */
  get name () {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('name unavailable for this transaction type')
    }
    this._checkFields(['name'])
    const txt = this._bytes.subarray(41 + 1, 41 + 1 + this._bytes[41])
    return Utf8Decode(txt)
  }

  set name (name) {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('name unavailable for this transaction type')
    }
    if (typeof name !== 'string') {
      throw new Error('name type must be a string')
    }
    const txt = Utf8Encode(name)
    if (txt.byteLength >= 36) {
      throw new Error('name is too long')
    }
    this._bytes[41] = txt.byteLength
    this._bytes.set(txt, 41 + 1)
    this._setFields(['name'])
  }

  /**
   * Устанавливает название структуры.
   * Доступно только для CreateStructure и UpdateStructure.
   * @param {string} name Название структуры в кодировке UTF-8.
   * @returns {Transaction}
   * @throws {Error}
   */
  setName (name) {
    this.name = name
    return this
  }

  /**
   * Профита в сотых долях процента с шагом в 0.01%.
   * Валидные значения от 100 до 500 (соотвественно от 1% до 5%).
   * Доступно только для CreateStructure и UpdateStructure.
   * @type {number}
   * @throws {Error}
   */
  get profitPercent () {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('profitPercent unavailable for this transaction type')
    }
    this._checkFields(['profitPercent'])
    return this._view.getUint16(37)
  }

  set profitPercent (percent) {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('profitPercent unavailable for this transaction type')
    }
    if (typeof percent !== 'number') {
      throw new Error('percent must be number')
    }
    if (Math.floor(percent) !== percent) {
      throw new Error('percent must be integer')
    }
    if (percent < 100 || percent > 500) {
      throw new Error('percent value must be between 100 and 500')
    }
    this._view.setUint16(37, percent)
    this._setFields(['profitPercent'])
  }

  /**
   * Устанавливает процент профита и возвращяет this.
   * Доступно только для CreateStructure и UpdateStructure.
   * @param {number} percent Профит в сотых долях процента с шагом в 0.01%. Валидные значения от 100 до 500 (соотвественно от 1% до 5%).
   * @returns {Transaction}
   * @throws {Error}
   */
  setProfitPercent (percent) {
    this.profitPercent = percent
    return this
  }

  /**
   * Комиссия в сотых долях процента с шагом в 0.01%.
   * Валидные значения от 0 до 2000 (соотвественно от 0% до 20%).
   * Доступно только для CreateStructure и UpdateStructure.
   * @type {number}
   * @throws {Error}
   */
  get feePercent () {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('feePercent unavailable for this transaction type')
    }
    this._checkFields(['feePercent'])
    return this._view.getUint16(39)
  }

  set feePercent (percent) {
    this._checkFields(['version'])
    if (this.version !== Transaction.CreateStructure &&
      this.version !== Transaction.UpdateStructure) {
      throw new Error('feePercent unavailable for this transaction type')
    }
    if (typeof percent !== 'number') {
      throw new Error('percent type must be number')
    }
    if (Math.floor(percent) !== percent) {
      throw new Error('percent type must be integer')
    }
    if (percent < 0 || percent > 2000) {
      throw new Error('percent value must be between 100 and 500')
    }
    this._view.setUint16(39, percent)
    this._setFields(['feePercent'])
  }

  /**
   * Устанавливает размер комисии и возвращяет this.
   * Доступно только для CreateStructure и UpdateStructure.
   * @param {number} percent Комиссия в сотых долях процента с шагом в 0.01%. Валидные значения от 0 до 2000 (соотвественно от 0% до 20%).
   * @returns {Transaction}
   * @throws {Error}
   */
  setFeePercent (percent) {
    this.feePercent = percent
    return this
  }

  /**
   * Nonce, целое число в промежутке от 0 до 18446744073709551615.
   * Из-за ограничений JavaScript максимальное доступное значение 9007199254740991.
   * Генерируется автоматичеки при вызове sign().
   * @type {number}
   * @throws {Error}
   */
  get nonce () {
    this._checkFields(['nonce'])
    if (this._view.getUint16(77) > 0x001f) {
      throw new Error('nonce is not safe integer')
    }
    return this._view.getUint32(77) * 4294967296 +
      this._view.getUint32(77 + 4)
  }

  set nonce (nonce) {
    if (typeof nonce !== 'number') {
      throw new Error('nonce type must be number')
    }
    if (Math.floor(nonce) !== nonce) {
      throw new Error('nonce type must be integer')
    }
    if (nonce < 0 || nonce > 9007199254740991) {
      throw new Error('nonce value must be between 0 and 9007199254740991')
    }
    this._view.setInt32(77 + 4, nonce | 0)
    this._view.setInt32(77, (nonce - this._view.getUint32(77 + 4)) / 4294967296)
    this._setFields(['nonce'])
  }

  /**
   * Устанавливает nonce и возвращяет this.
   * @param {number} nonce Nonce, целое числов промежутке от 0 до 9007199254740991.
   * @returns {Transaction}
   * @throws {Error}
   */
  setNonce (nonce) {
    this.nonce = nonce
    return this
  }

  /**
   * Цифровая подпись транзкции, длина 64 байта.
   * Генерируется автоматически при вызове sign().
   * @type {Uint8Array}
   * @throws {Error}
   */
  get signature () {
    this._checkFields(['signature'])
    const len = this.sender.publicKey.signatureLength
    const sig = new Uint8Array(len)
    sig.set(this._bytes.subarray(85, 85 + len))
    return sig
  }

  set signature (signature) {
    this._checkFields(['version', 'sender'])
    if (!(signature instanceof Uint8Array)) {
      throw new Error('signature type must be Uint8Array')
    }
    if (signature.byteLength !== this.sender.publicKey.signatureLength) {
      throw new Error('incorrect signature length')
    }
    this._bytes.set(signature, 85)
    this._setFields(['signature'])
  }

  /**
   * Устанавливает цифровую подпись и возвращяет this.
   * @param {Uint8Array} signature Подпись, длина 64 байта.
   * @returns {Transaction}
   * @throws {Error}
   */
  setSignature (signature) {
    this.signature = signature
    return this
  }

  /**
   * Подписать транзакцию приватным ключем.
   * @param {SecretKey} secretKey
   * @throws {Error}
   */
  sign (secretKey) {
    this._checkFields(['version', 'sender'])
    if (!(secretKey instanceof SecretKey)) {
      throw new Error('secretKey type must be SecretKey')
    }
    const msg = this._bytes.subarray(0, 85)
    this.signature = secretKey.sign(msg)
    return this
  }

  /**
   * Проверить транзакцию на соотвествие формальным правилам.
   * @returns {boolean}
   * @throws {Error}
   */
  verify () {
    this._checkFields(['version', 'sender', 'signature'])
    const msg = this._bytes.subarray(0, 85)
    return this.sender.publicKey.verifySignature(this.signature, msg)
  }
}
/**
 * Цифровые подписи Ed25519.
 * Implementation derived from TweetNaCl version 20140427.
 * @see http://tweetnacl.cr.yp.to/
 * @class
 * @private
 */
class Ed25519 {
  constructor () {
    this._D = new Float64Array([
      0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070,
      0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203
    ])
    this._D2 = new Float64Array([
      0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0,
      0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406
    ])
    this._gf0 = new Float64Array(16)
    this._gf1 = new Float64Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    this._L = new Float64Array([
      0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58,
      0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0x10
    ])
    this._I = new Float64Array([
      0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43,
      0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83
    ])
    this._X = new Float64Array([
      0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c,
      0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169
    ])
    this._Y = new Float64Array([
      0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666,
      0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666
    ])
  }

  /**
   * Длина публичного ключа в байтах.
   * @type {number}
   */
  static get PUBLIC_KEY_BYTES () { return 32 }
  /**
   * Длина приватного ключа в байтах.
   * @type {number}
   */
  static get SECRET_KEY_BYTES () { return 64 }
  /**
   * Длина seed в байтах.
   * @type {number}
   */
  static get SEED_BYTES () { return 32 }
  /**
   * Длина подписи в байтах.
   * @type {number}
   */
  static get SIGNATURE_BYTES () { return 64 }
  /**
   * Подписать сообщение.
   * @param {Uint8Array} message
   * @param {Uint8Array} secretKey
   * @returns {Uint8Array}
   * @throws {Error}
   */
  sign (message, secretKey) {
    const signedMsg = new Uint8Array(Ed25519.SIGNATURE_BYTES + message.length)
    this._cryptoSign(signedMsg, message, message.length, secretKey)
    return new Uint8Array(signedMsg.buffer, 0, Ed25519.SIGNATURE_BYTES)
  }

  /**
   * Проверить подпись.
   * @param {Uint8Array} message
   * @param {Uint8Array} signature
   * @param {Uint8Array} publicKey
   * @returns {boolean}
   */
  verify (signature, message, publicKey) {
    const sm = new Uint8Array(Ed25519.SIGNATURE_BYTES + message.length)
    const m = new Uint8Array(Ed25519.SIGNATURE_BYTES + message.length)
    let i
    for (i = 0; i < Ed25519.SIGNATURE_BYTES; i++) {
      sm[i] = signature[i]
    }
    for (i = 0; i < message.length; i++) {
      sm[i + Ed25519.SIGNATURE_BYTES] = message[i]
    }
    return (this._cryptoSignOpen(m, sm, sm.length, publicKey) >= 0)
  }

  /**
   * Получить приватный ключ из seed.
   * @param {Uint8Array} seed
   * @returns {Uint8Array}
   */
  secretKeyFromSeed (seed) {
    const pk = new Uint8Array(Ed25519.PUBLIC_KEY_BYTES)
    const sk = new Uint8Array(Ed25519.SECRET_KEY_BYTES)
    for (let i = 0; i < 32; i++) {
      sk[i] = seed[i]
    }
    this._cryptoSignKeypair(pk, sk)
    return sk
  }

  /**
   * Получить публичный ключ из приватного ключа.
   * @param {Uint8Array} secretKey
   * @returns {Uint8Array}
   */
  publicKeyFromSecretKey (secretKey) {
    const b = new Uint8Array(Ed25519.PUBLIC_KEY_BYTES)
    b.set(new Uint8Array(secretKey.buffer, 32, 32))
    return b
  }

  /**
   * @param {Float64Array[]} p
   * @param {Float64Array[]} q
   * @private
   */
  _add (p, q) {
    const a = new Float64Array(16)
    const b = new Float64Array(16)
    const c = new Float64Array(16)
    const d = new Float64Array(16)
    const e = new Float64Array(16)
    const f = new Float64Array(16)
    const g = new Float64Array(16)
    const h = new Float64Array(16)
    const t = new Float64Array(16)
    this._fnZ(a, p[1], p[0])
    this._fnZ(t, q[1], q[0])
    this._fnM(a, a, t)
    this._fnA(b, p[0], p[1])
    this._fnA(t, q[0], q[1])
    this._fnM(b, b, t)
    this._fnM(c, p[3], q[3])
    this._fnM(c, c, this._D2)
    this._fnM(d, p[2], q[2])
    this._fnA(d, d, d)
    this._fnZ(e, b, a)
    this._fnZ(f, d, c)
    this._fnA(g, d, c)
    this._fnA(h, b, a)
    this._fnM(p[0], e, f)
    this._fnM(p[1], h, g)
    this._fnM(p[2], g, f)
    this._fnM(p[3], e, h)
  }

  /**
   * @param {Float64Array} o
   * @private
   */
  _car25519 (o) {
    let v
    let c = 1
    for (let i = 0; i < 16; i++) {
      v = o[i] + c + 65535
      c = Math.floor(v / 65536)
      o[i] = v - c * 65536
    }
    o[0] += c - 1 + 37 * (c - 1)
  }

  /**
   * @param {Uint8Array} out
   * @param {Uint8Array} m
   * @param {number} n
   * @private
   */
  _cryptoHash (out, m, n) {
    const hh = new Int32Array(8)
    const hl = new Int32Array(8)
    const x = new Uint8Array(256)
    let i
    const b = n
    hh[0] = 0x6a09e667
    hh[1] = 0xbb67ae85
    hh[2] = 0x3c6ef372
    hh[3] = 0xa54ff53a
    hh[4] = 0x510e527f
    hh[5] = 0x9b05688c
    hh[6] = 0x1f83d9ab
    hh[7] = 0x5be0cd19
    hl[0] = 0xf3bcc908
    hl[1] = 0x84caa73b
    hl[2] = 0xfe94f82b
    hl[3] = 0x5f1d36f1
    hl[4] = 0xade682d1
    hl[5] = 0x2b3e6c1f
    hl[6] = 0xfb41bd6b
    hl[7] = 0x137e2179
    this._cryptoHashBlocksHl(hh, hl, m, n)
    n %= 128
    for (i = 0; i < n; i++) {
      x[i] = m[b - n + i]
    }
    x[n] = 128
    n = 256 - 128 * (n < 112 ? 1 : 0)
    x[n - 9] = 0
    this._ts64(x, n - 8, (b / 0x20000000) | 0, b << 3)
    this._cryptoHashBlocksHl(hh, hl, x, n)
    for (i = 0; i < 8; i++) {
      this._ts64(out, 8 * i, hh[i], hl[i])
    }
    return 0
  }

  /**
   * @param {Int32Array} hh
   * @param {Int32Array} hl
   * @param {Uint8Array} m
   * @param {number} n
   * @private
   */
  _cryptoHashBlocksHl (hh, hl, m, n) {
    const wh = new Int32Array(16)
    const wl = new Int32Array(16)
    const K = [
      0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
      0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
      0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
      0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
      0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
      0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
      0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
      0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
      0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
      0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
      0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
      0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
      0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
      0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
      0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
      0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
      0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
      0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
      0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
      0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
      0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
      0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
      0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
      0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
      0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
      0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
      0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
      0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
      0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
      0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
      0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
      0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
      0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
      0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
      0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
      0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
      0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
      0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
      0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
      0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
    ]
    let bh0
    let bh1
    let bh2
    let bh3
    let bh4
    let bh5
    let bh6
    let bh7
    let bl0
    let bl1
    let bl2
    let bl3
    let bl4
    let bl5
    let bl6
    let bl7
    let th
    let tl
    let i
    let j
    let h
    let l
    let a
    let b
    let c
    let d
    let ah0 = hh[0]
    let ah1 = hh[1]
    let ah2 = hh[2]
    let ah3 = hh[3]
    let ah4 = hh[4]
    let ah5 = hh[5]
    let ah6 = hh[6]
    let ah7 = hh[7]
    let al0 = hl[0]
    let al1 = hl[1]
    let al2 = hl[2]
    let al3 = hl[3]
    let al4 = hl[4]
    let al5 = hl[5]
    let al6 = hl[6]
    let al7 = hl[7]
    let pos = 0
    while (n >= 128) {
      for (i = 0; i < 16; i++) {
        j = 8 * i + pos
        wh[i] = (m[j + 0] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]
        wl[i] = (m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7]
      }
      for (i = 0; i < 80; i++) {
        bh0 = ah0
        bh1 = ah1
        bh2 = ah2
        bh3 = ah3
        bh4 = ah4
        bh5 = ah5
        bh6 = ah6
        bh7 = ah7
        bl0 = al0
        bl1 = al1
        bl2 = al2
        bl3 = al3
        bl4 = al4
        bl5 = al5
        bl6 = al6
        bl7 = al7
        h = ah7
        l = al7
        a = l & 0xffff
        b = l >>> 16
        c = h & 0xffff
        d = h >>> 16
        h = ((ah4 >>> 14) | (al4 << (32 - 14))) ^
          ((ah4 >>> 18) | (al4 << (32 - 18))) ^
          ((al4 >>> (41 - 32)) | (ah4 << (32 - (41 - 32))))
        l = ((al4 >>> 14) | (ah4 << (32 - 14))) ^
          ((al4 >>> 18) | (ah4 << (32 - 18))) ^
          ((ah4 >>> (41 - 32)) | (al4 << (32 - (41 - 32))))
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        h = (ah4 & ah5) ^ (~ah4 & ah6)
        l = (al4 & al5) ^ (~al4 & al6)
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        h = K[i * 2]
        l = K[i * 2 + 1]
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        h = wh[i % 16]
        l = wl[i % 16]
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        b += a >>> 16
        c += b >>> 16
        d += c >>> 16
        th = c & 0xffff | d << 16
        tl = a & 0xffff | b << 16
        h = th
        l = tl
        a = l & 0xffff
        b = l >>> 16
        c = h & 0xffff
        d = h >>> 16
        h = ((ah0 >>> 28) | (al0 << (32 - 28))) ^
          ((al0 >>> (34 - 32)) | (ah0 << (32 - (34 - 32)))) ^
          ((al0 >>> (39 - 32)) | (ah0 << (32 - (39 - 32))))
        l = ((al0 >>> 28) | (ah0 << (32 - 28))) ^
          ((ah0 >>> (34 - 32)) | (al0 << (32 - (34 - 32)))) ^
          ((ah0 >>> (39 - 32)) | (al0 << (32 - (39 - 32))))
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2)
        l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2)
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        b += a >>> 16
        c += b >>> 16
        d += c >>> 16
        bh7 = (c & 0xffff) | (d << 16)
        bl7 = (a & 0xffff) | (b << 16)
        h = bh3
        l = bl3
        a = l & 0xffff
        b = l >>> 16
        c = h & 0xffff
        d = h >>> 16
        h = th
        l = tl
        a += l & 0xffff
        b += l >>> 16
        c += h & 0xffff
        d += h >>> 16
        b += a >>> 16
        c += b >>> 16
        d += c >>> 16
        bh3 = (c & 0xffff) | (d << 16)
        bl3 = (a & 0xffff) | (b << 16)
        ah1 = bh0
        ah2 = bh1
        ah3 = bh2
        ah4 = bh3
        ah5 = bh4
        ah6 = bh5
        ah7 = bh6
        ah0 = bh7
        al1 = bl0
        al2 = bl1
        al3 = bl2
        al4 = bl3
        al5 = bl4
        al6 = bl5
        al7 = bl6
        al0 = bl7
        if (i % 16 === 15) {
          for (j = 0; j < 16; j++) {
            h = wh[j]
            l = wl[j]
            a = l & 0xffff
            b = l >>> 16
            c = h & 0xffff
            d = h >>> 16
            h = wh[(j + 9) % 16]
            l = wl[(j + 9) % 16]
            a += l & 0xffff
            b += l >>> 16
            c += h & 0xffff
            d += h >>> 16
            th = wh[(j + 1) % 16]
            tl = wl[(j + 1) % 16]
            h = ((th >>> 1) | (tl << (32 - 1))) ^
              ((th >>> 8) | (tl << (32 - 8))) ^ (th >>> 7)
            l = ((tl >>> 1) | (th << (32 - 1))) ^
              ((tl >>> 8) | (th << (32 - 8))) ^ ((tl >>> 7) | (th << (32 - 7)))
            a += l & 0xffff
            b += l >>> 16
            c += h & 0xffff
            d += h >>> 16
            th = wh[(j + 14) % 16]
            tl = wl[(j + 14) % 16]
            h = ((th >>> 19) | (tl << (32 - 19))) ^
              ((tl >>> (61 - 32)) | (th << (32 - (61 - 32)))) ^ (th >>> 6)
            l = ((tl >>> 19) | (th << (32 - 19))) ^
              ((th >>> (61 - 32)) | (tl << (32 - (61 - 32)))) ^
              ((tl >>> 6) | (th << (32 - 6)))
            a += l & 0xffff
            b += l >>> 16
            c += h & 0xffff
            d += h >>> 16
            b += a >>> 16
            c += b >>> 16
            d += c >>> 16
            wh[j] = (c & 0xffff) | (d << 16)
            wl[j] = (a & 0xffff) | (b << 16)
          }
        }
      }
      h = ah0
      l = al0
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[0]
      l = hl[0]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[0] = ah0 = (c & 0xffff) | (d << 16)
      hl[0] = al0 = (a & 0xffff) | (b << 16)
      h = ah1
      l = al1
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[1]
      l = hl[1]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[1] = ah1 = (c & 0xffff) | (d << 16)
      hl[1] = al1 = (a & 0xffff) | (b << 16)
      h = ah2
      l = al2
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[2]
      l = hl[2]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[2] = ah2 = (c & 0xffff) | (d << 16)
      hl[2] = al2 = (a & 0xffff) | (b << 16)
      h = ah3
      l = al3
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[3]
      l = hl[3]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[3] = ah3 = (c & 0xffff) | (d << 16)
      hl[3] = al3 = (a & 0xffff) | (b << 16)
      h = ah4
      l = al4
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[4]
      l = hl[4]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[4] = ah4 = (c & 0xffff) | (d << 16)
      hl[4] = al4 = (a & 0xffff) | (b << 16)
      h = ah5
      l = al5
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[5]
      l = hl[5]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[5] = ah5 = (c & 0xffff) | (d << 16)
      hl[5] = al5 = (a & 0xffff) | (b << 16)
      h = ah6
      l = al6
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[6]
      l = hl[6]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[6] = ah6 = (c & 0xffff) | (d << 16)
      hl[6] = al6 = (a & 0xffff) | (b << 16)
      h = ah7
      l = al7
      a = l & 0xffff
      b = l >>> 16
      c = h & 0xffff
      d = h >>> 16
      h = hh[7]
      l = hl[7]
      a += l & 0xffff
      b += l >>> 16
      c += h & 0xffff
      d += h >>> 16
      b += a >>> 16
      c += b >>> 16
      d += c >>> 16
      hh[7] = ah7 = (c & 0xffff) | (d << 16)
      hl[7] = al7 = (a & 0xffff) | (b << 16)
      pos += 128
      n -= 128
    }
    return n
  }

  /**
   * Note: difference from C - smlen returned, not passed as argument.
   * @param {Uint8Array} sm
   * @param {Uint8Array} m
   * @param {number} n
   * @param {Uint8Array} sk
   * @private
   */
  _cryptoSign (sm, m, n, sk) {
    const d = new Uint8Array(64)
    const h = new Uint8Array(64)
    const r = new Uint8Array(64)
    let i
    let j
    const x = new Float64Array(64)
    const p = [
      new Float64Array(16),
      new Float64Array(16),
      new Float64Array(16),
      new Float64Array(16)
    ]
    this._cryptoHash(d, sk, 32)
    d[0] &= 248
    d[31] &= 127
    d[31] |= 64
    const smlen = n + 64
    for (i = 0; i < n; i++) {
      sm[64 + i] = m[i]
    }
    for (i = 0; i < 32; i++) {
      sm[32 + i] = d[32 + i]
    }
    this._cryptoHash(r, sm.subarray(32), n + 32)
    this._reduce(r)
    this._scalarbase(p, r)
    this._pack(sm, p)
    for (i = 32; i < 64; i++) {
      sm[i] = sk[i]
    }
    this._cryptoHash(h, sm, n + 64)
    this._reduce(h)
    for (i = 0; i < 64; i++) {
      x[i] = 0
    }
    for (i = 0; i < 32; i++) {
      x[i] = r[i]
    }
    for (i = 0; i < 32; i++) {
      for (j = 0; j < 32; j++) {
        x[i + j] += h[i] * d[j]
      }
    }
    this._modL(sm.subarray(32), x)
    return smlen
  }

  /**
   * @param {Uint8Array} pk
   * @param {Uint8Array} sk
   * @private
   */
  _cryptoSignKeypair (pk, sk) {
    const d = new Uint8Array(64)
    const p = [
      new Float64Array(16), new Float64Array(16),
      new Float64Array(16), new Float64Array(16)
    ]
    this._cryptoHash(d, sk, 32)
    d[0] &= 248
    d[31] &= 127
    d[31] |= 64
    this._scalarbase(p, d)
    this._pack(pk, p)
    for (let i = 0; i < 32; i++) {
      sk[i + 32] = pk[i]
    }
    return 0
  }

  /**
   * @param {Uint8Array} m
   * @param {Uint8Array} sm
   * @param {number} n
   * @param {Uint8Array} pk
   * @private
   */
  _cryptoSignOpen (m, sm, n, pk) {
    const t = new Uint8Array(32)
    const h = new Uint8Array(64)
    const p = [
      new Float64Array(16), new Float64Array(16),
      new Float64Array(16), new Float64Array(16)
    ]
    const q = [
      new Float64Array(16), new Float64Array(16),
      new Float64Array(16), new Float64Array(16)
    ]
    /* istanbul ignore if */
    if (this._unpackneg(q, pk)) {
      return -1
    }
    for (let i = 0; i < n; i++) {
      m[i] = sm[i]
    }
    for (let i = 0; i < 32; i++) {
      m[i + 32] = pk[i]
    }
    this._cryptoHash(h, m, n)
    this._reduce(h)
    this._scalarmult(p, q, h)
    this._scalarbase(q, sm.subarray(32))
    this._add(p, q)
    this._pack(t, p)
    if (this._cryptoVerify32(sm, t)) {
      return -1
    }
    return n
  }

  /**
   * @param {Uint8Array} x
   * @param {number} xi
   * @param {Uint8Array} y
   * @param {number} yi
   * @private
   */
  _cryptoVerify32 (x, y) {
    let d = 0
    for (let i = 0; i < 32; i++) {
      d |= x[i] ^ y[i]
    }
    return (1 & ((d - 1) >>> 8)) - 1
  }

  /**
   * @param {Float64Array[]} p
   * @param {Float64Array[]} q
   * @param {number} b
   * @private
   */
  _cswap (p, q, b) {
    for (let i = 0; i < 4; i++) {
      this._sel25519(p[i], q[i], b)
    }
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} a
   * @param {Float64Array} b
   * @private
   */
  _fnA (o, a, b) {
    for (let i = 0; i < 16; i++) {
      o[i] = a[i] + b[i]
    }
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} a
   * @param {Float64Array} b
   * @private
   */
  _fnM (o, a, b) {
    const t = new Float64Array(31)
    for (let i = 0; i < 31; i++) {
      t[i] = 0
    }
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        t[i + j] += a[i] * b[j]
      }
    }
    for (let i = 0; i < 15; i++) {
      t[i] += 38 * t[i + 16]
    }
    for (let i = 0; i < 16; i++) {
      o[i] = t[i]
    }
    this._car25519(o)
    this._car25519(o)
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} a
   * @private
   */
  _fnS (o, a) {
    this._fnM(o, a, a)
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} a
   * @param {Float64Array} b
   * @private
   */
  _fnZ (o, a, b) {
    for (let i = 0; i < 16; i++) {
      o[i] = a[i] - b[i]
    }
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} i
   * @private
   */
  _inv25519 (o, i) {
    const c = new Float64Array(16)
    for (let a = 0; a < 16; a++) {
      c[a] = i[a]
    }
    for (let a = 253; a >= 0; a--) {
      this._fnS(c, c)
      if (a !== 2 && a !== 4) {
        this._fnM(c, c, i)
      }
    }
    for (let a = 0; a < 16; a++) {
      o[a] = c[a]
    }
  }

  /**
   * @param {Uint8Array} r
   * @param {Float64Array} x
   * @private
   */
  _modL (r, x) {
    let carry
    let j
    let k
    for (let i = 63; i >= 32; --i) {
      carry = 0
      for (j = i - 32, k = i - 12; j < k; ++j) {
        x[j] += carry - 16 * x[i] * this._L[j - (i - 32)]
        carry = Math.floor((x[j] + 128) / 256)
        x[j] -= carry * 256
      }
      x[j] += carry
      x[i] = 0
    }
    carry = 0
    for (let j = 0; j < 32; j++) {
      x[j] += carry - (x[31] >> 4) * this._L[j]
      carry = x[j] >> 8
      x[j] &= 255
    }
    for (let j = 0; j < 32; j++) {
      x[j] -= carry * this._L[j]
    }
    for (let i = 0; i < 32; i++) {
      x[i + 1] += x[i] >> 8
      r[i] = x[i] & 255
    }
  }

  /**
   * @param {Float64Array} a
   * @param {Float64Array} b
   * @private
   */
  _neq25519 (a, b) {
    const c = new Uint8Array(32)
    const d = new Uint8Array(32)
    this._pack25519(c, a)
    this._pack25519(d, b)
    return this._cryptoVerify32(c, d)
  }

  /**
   * @param {Uint8Array} r
   * @param {Float64Array[]} p
   * @private
   */
  _pack (r, p) {
    const tx = new Float64Array(16)
    const ty = new Float64Array(16)
    const zi = new Float64Array(16)
    this._inv25519(zi, p[2])
    this._fnM(tx, p[0], zi)
    this._fnM(ty, p[1], zi)
    this._pack25519(r, ty)
    r[31] ^= this._par25519(tx) << 7
  }

  /**
   * @param {Uint8Array} o
   * @param {Float64Array} n
   * @private
   */
  _pack25519 (o, n) {
    let b
    const m = new Float64Array(16)
    const t = new Float64Array(16)
    for (let i = 0; i < 16; i++) {
      t[i] = n[i]
    }
    this._car25519(t)
    this._car25519(t)
    this._car25519(t)
    for (let j = 0; j < 2; j++) {
      m[0] = t[0] - 0xffed
      for (let i = 1; i < 15; i++) {
        m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1)
        m[i - 1] &= 0xffff
      }
      m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1)
      b = (m[15] >> 16) & 1
      m[14] &= 0xffff
      this._sel25519(t, m, 1 - b)
    }
    for (let i = 0; i < 16; i++) {
      o[2 * i] = t[i] & 0xff
      o[2 * i + 1] = t[i] >> 8
    }
  }

  /**
   * @param {Float64Array} a
   * @private
   */
  _par25519 (a) {
    const d = new Uint8Array(32)
    this._pack25519(d, a)
    return d[0] & 1
  }

  /**
   * @param {Float64Array} o
   * @param {Float64Array} i
   * @private
   */
  _pow2523 (o, i) {
    const c = new Float64Array(16)
    for (let a = 0; a < 16; a++) {
      c[a] = i[a]
    }
    for (let a = 250; a >= 0; a--) {
      this._fnS(c, c)
      if (a !== 1) {
        this._fnM(c, c, i)
      }
    }
    for (let a = 0; a < 16; a++) {
      o[a] = c[a]
    }
  }

  /**
   * @param {Uint8Array} r
   * @private
   */
  _reduce (r) {
    const x = new Float64Array(64)
    for (let i = 0; i < 64; i++) {
      x[i] = r[i]
    }
    for (let i = 0; i < 64; i++) {
      r[i] = 0
    }
    this._modL(r, x)
  }

  /**
   * @param {Float64Array[]} p
   * @param {Uint8Array} s
   * @private
   */
  _scalarbase (p, s) {
    const q = [
      new Float64Array(16), new Float64Array(16),
      new Float64Array(16), new Float64Array(16)
    ]
    this._set25519(q[0], this._X)
    this._set25519(q[1], this._Y)
    this._set25519(q[2], this._gf1)
    this._fnM(q[3], this._X, this._Y)
    this._scalarmult(p, q, s)
  }

  /**
   * @param {Float64Array[]} p
   * @param {Float64Array[]} q
   * @param {Uint8Array} s
   * @private
   */
  _scalarmult (p, q, s) {
    let b
    this._set25519(p[0], this._gf0)
    this._set25519(p[1], this._gf1)
    this._set25519(p[2], this._gf1)
    this._set25519(p[3], this._gf0)
    for (let i = 255; i >= 0; --i) {
      b = (s[(i / 8) | 0] >> (i & 7)) & 1
      this._cswap(p, q, b)
      this._add(q, p)
      this._add(p, p)
      this._cswap(p, q, b)
    }
  }

  /**
   * @param {Float64Array} p
   * @param {Float64Array} q
   * @param {number} b
   * @private
   */
  _sel25519 (p, q, b) {
    let t
    const c = ~(b - 1)
    for (let i = 0; i < 16; i++) {
      t = c & (p[i] ^ q[i])
      p[i] ^= t
      q[i] ^= t
    }
  }

  /**
   * @param {Float64Array} r
   * @param {Float64Array} a
   * @private
   */
  _set25519 (r, a) {
    for (let i = 0; i < 16; i++) {
      r[i] = a[i]
    }
  }

  /**
   * @param {Uint8Array} x
   * @param {number} i
   * @param {number} h
   * @param {number} l
   * @private
   */
  _ts64 (x, i, h, l) {
    x[i] = (h >> 24) & 0xff
    x[i + 1] = (h >> 16) & 0xff
    x[i + 2] = (h >> 8) & 0xff
    x[i + 3] = h & 0xff
    x[i + 4] = (l >> 24) & 0xff
    x[i + 5] = (l >> 16) & 0xff
    x[i + 6] = (l >> 8) & 0xff
    x[i + 7] = l & 0xff
  }

  /**
   * @param {Float64Array} o
   * @param {Uint8Array} n
   * @private
   */
  _unpack25519 (o, n) {
    for (let i = 0; i < 16; i++) {
      o[i] = n[2 * i] + (n[2 * i + 1] << 8)
    }
    o[15] &= 0x7fff
  }

  /**
   * @param {Float64Array[]} r
   * @param {Uint8Array} p
   * @private
   */
  _unpackneg (r, p) {
    const t = new Float64Array(16)
    const chk = new Float64Array(16)
    const num = new Float64Array(16)
    const den = new Float64Array(16)
    const den2 = new Float64Array(16)
    const den4 = new Float64Array(16)
    const den6 = new Float64Array(16)
    this._set25519(r[2], this._gf1)
    this._unpack25519(r[1], p)
    this._fnS(num, r[1])
    this._fnM(den, num, this._D)
    this._fnZ(num, num, r[2])
    this._fnA(den, r[2], den)
    this._fnS(den2, den)
    this._fnS(den4, den2)
    this._fnM(den6, den4, den2)
    this._fnM(t, den6, num)
    this._fnM(t, t, den)
    this._pow2523(t, t)
    this._fnM(t, t, num)
    this._fnM(t, t, den)
    this._fnM(t, t, den)
    this._fnM(r[0], t, den)
    this._fnS(chk, r[0])
    this._fnM(chk, chk, den)
    if (this._neq25519(chk, num)) {
      this._fnM(r[0], r[0], this._I)
    }
    this._fnS(chk, r[0])
    this._fnM(chk, chk, den)
    /* istanbul ignore if */
    if (this._neq25519(chk, num)) {
      return -1
    }
    if (this._par25519(r[0]) === (p[31] >> 7)) {
      this._fnZ(r[0], this._gf0, r[0])
    }
    this._fnM(r[3], r[0], r[1])
    return 0
  }
}
/**
 * Конвертер цифровой версии префикса в текстовое представление.
 * @param {number} version
 * @returns {string}
 * @throws {Error}
 * @private
 */
function versionToPrefix (version) {
  if (typeof version !== 'number') {
    throw new Error('version must be number')
  }
  if (Math.floor(version) !== version) {
    throw new Error('version must be integer')
  }
  if (version === 0) {
    return 'genesis'
  }
  if ((version & 0x8000) === 0x8000) {
    throw new Error('incorrect version - first bit must be zero')
  }
  const a = (version & 0x7C00) >> 10
  const b = (version & 0x03E0) >> 5
  const c = (version & 0x001F)
  if (a < 1 || a > 26) {
    throw new Error('incorrect version - first char')
  }
  if (b < 1 || b > 26) {
    throw new Error('incorrect version - second char')
  }
  if (c < 1 || c > 26) {
    throw new Error('incorrect version - third char')
  }
  return String.fromCharCode((a + 96), (b + 96), (c + 96))
}
/**
 * Конвертер текстовой версии префикса в числовое представление.
 * @param {string} prefix
 * @returns {number}
 * @throws {Error}
 * @private
 */
function prefixToVersion (prefix) {
  if (typeof prefix !== 'string') {
    throw new Error('prefix must be string')
  }
  if (prefix === 'genesis') {
    return 0
  }
  if (prefix.length !== 3) {
    throw new Error('prefix must be 3 bytes ling')
  }
  const a = prefix.charCodeAt(0) - 96
  const b = prefix.charCodeAt(1) - 96
  const c = prefix.charCodeAt(2) - 96
  if (a < 1 || a > 26) {
    throw new Error('incorrect prefix - first char')
  }
  if (b < 1 || b > 26) {
    throw new Error('incorrect prefix - second char')
  }
  if (c < 1 || c > 26) {
    throw new Error('incorrect prefix - third char')
  }
  return (a << 10) + (b << 5) + c
}
/**
 * Безопасный алгоритм хеширования, SHA2-256.
 * @see https://en.wikipedia.org/wiki/SHA-2
 * @function
 * @param {Uint8Array} message message
 * @returns {Uint8Array} hash
 * @throws {Error}
 * @private
 */
function sha256 (message) {
  const hh = new Int32Array([
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
  ])
  const k = new Int32Array([
    0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
    0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
    0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
    0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
    0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
    0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
    0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
    0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
    0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
    0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
    0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
    0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
    0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
    0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
    0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
    0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
  ])
  const w = new Int32Array(64)
  let l = message.byteLength + 8
  l += (64 - (l % 64))
  const m = new Uint8Array(l)
  const q = new DataView(m.buffer)
  m.set(message)
  m[message.byteLength] = 0x80
  q.setUint32(q.byteLength - 4, message.byteLength * 8)
  for (let j = 0; j < m.byteLength; j += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = q.getInt32(j + (i * 4))
    }
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3)
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10)
      w[i] = w[i - 16] + s0 + w[i - 7] + s1
    }
    let a = hh[0]
    let b = hh[1]
    let c = hh[2]
    let d = hh[3]
    let e = hh[4]
    let f = hh[5]
    let g = hh[6]
    let h = hh[7]
    for (let i = 0; i < 64; i++) {
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10))
      const Ma = (a & b) ^ (a & c) ^ (b & c)
      const t2 = S0 + Ma
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7))
      const Ch = (e & f) ^ ((~e) & g)
      const t1 = h + S1 + Ch + k[i] + w[i]
      h = g
      g = f
      f = e
      e = d + t1
      d = c
      c = b
      b = a
      a = t1 + t2
    }
    hh[0] += a
    hh[1] += b
    hh[2] += c
    hh[3] += d
    hh[4] += e
    hh[5] += f
    hh[6] += g
    hh[7] += h
  }
  const hash = new DataView(hh.buffer)
  for (let i = 0; i < 8; i++) {
    hash.setUint32(i * 4, hh[i])
  }
  return new Uint8Array(hash.buffer)
}
/**
 * Конвертер строки в типизированный массив UTF-8 байтов.
 * @function
 * @param {string} text
 * @returns {Uint8Array}
 * @private
 */
function Utf8Encode (text) {
  const bytes = []
  for (let i = 0; i < text.length; i++) {
    let chr = text.charCodeAt(i)
    if (chr < 0x80) {
      bytes.push(chr)
    } else if (chr < 0x800) {
      bytes.push(0xc0 | (chr >> 6), 0x80 | (chr & 0x3f))
    } else if (chr < 0xd800 || chr >= 0xe000) {
      bytes.push(0xe0 | (chr >> 12), 0x80 | ((chr >> 6) & 0x3f), 0x80 | (chr & 0x3f))
    } else {
      chr = 0x10000 + ((chr & 0x3ff) << 10) + (text.charCodeAt(++i) & 0x3ff)
      bytes.push(0xf0 | (chr >> 18), 0x80 | ((chr >> 12) & 0x3f), 0x80 | ((chr >> 6) & 0x3f), 0x80 | (chr & 0x3f))
    }
  }
  return new Uint8Array(bytes)
}
/**
 * Конвертер из типизированного массива UTF-8 байтов в строку.
 * @function
 * @param {Uint8Array} bytes
 * @returns {string}
 * @private
 */
function Utf8Decode (bytes) {
  let str = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    const chr = bytes[i]
    if (chr < 0x80) {
      str += String.fromCharCode(chr)
    } else if (chr > 0xBF && chr < 0xE0) {
      str += String.fromCharCode((chr & 0x1F) << 6 | bytes[++i] & 0x3F)
    } else if (chr > 0xDF && chr < 0xF0) {
      str += String.fromCharCode((chr & 0x0F) << 12 | (bytes[++i] & 0x3F) << 6 | bytes[++i] & 0x3F)
    } else {
      const charCode = ((chr & 0x07) << 18 | (bytes[++i] & 0x3F) << 12 |
        (bytes[++i] & 0x3F) << 6 | bytes[++i] & 0x3F) - 0x010000
      str += String.fromCharCode(charCode >> 10 | 0xD800, charCode & 0x03FF | 0xDC00)
    }
  }
  return str
}
/**
 * Конвертер адресов в формате Bech32.
 * @class
 * @private
 */
class Bech32 {
  /**
   * @type {string}
   * @private
   */
  static get _ALPHABET () { return 'qpzry9x8gf2tvdw0s3jn54khce6mua7l' }
  /**
   * @type {Object}
   * @private
   */
  static get _ALPHABET_MAP () {
    return {
      0: 15,
      2: 10,
      3: 17,
      4: 21,
      5: 20,
      6: 26,
      7: 30,
      8: 7,
      9: 5,
      q: 0,
      p: 1,
      z: 2,
      r: 3,
      y: 4,
      x: 6,
      g: 8,
      f: 9,
      t: 11,
      v: 12,
      d: 13,
      w: 14,
      s: 16,
      j: 18,
      n: 19,
      k: 22,
      h: 23,
      c: 24,
      e: 25,
      m: 27,
      u: 28,
      a: 29,
      l: 31
    }
  }

  /**
   * @param {Uint8Array} bytes
   * @returns {string}
   * @throws {Error}
   */
  static encode (bytes) {
    const prefix = versionToPrefix(new DataView(bytes.buffer).getUint16(0))
    const data = new Uint8Array(bytes.subarray(2))
    return this._encode(prefix, this._convert(data, 8, 5, true))
  }

  /**
   * @param {string} bech32
   * @returns {Uint8Array}
   * @throws {Error}
   */
  static decode (bech32) {
    const raw = this._decode(bech32)
    const bytes = this._convert(raw.words, 5, 8, false)
    if (bytes.length !== 32) {
      throw new Error('invalid data length')
    }
    const res = new Uint8Array(34)
    res.set(bytes, 2)
    new DataView(res.buffer).setUint16(0, prefixToVersion(raw.prefix))
    return res
  }

  /**
   * @param {string} prefix
   * @param {number[]} words
   * @returns {string}
   * @throws {Error}
   * @private
   */
  static _encode (prefix, words) {
    prefix = prefix.toLowerCase()
    let chk = this._prefixChk(prefix)
    let result = prefix + '1'
    let word
    for (word of words) {
      chk = this._polymodStep(chk) ^ word
      result += this._ALPHABET.charAt(word)
    }
    for (let i = 0; i < 6; ++i) {
      chk = this._polymodStep(chk)
    }
    chk ^= 1
    for (let i = 0; i < 6; ++i) {
      const v = (chk >> ((5 - i) * 5)) & 0x1f
      result += this._ALPHABET.charAt(v)
    }
    return result
  }

  /**
   * @param {string} str
   * @returns {Object}
   * @throws {Error}
   * @private
   */
  static _decode (str) {
    const lowered = str.toLowerCase()
    const uppered = str.toUpperCase()
    if (str !== lowered && str !== uppered) {
      throw new Error('Mixed-case string ' + str)
    }
    str = lowered
    const split = str.lastIndexOf('1')
    if (split === -1) {
      throw new Error('No separator character for ' + str)
    }
    if (split === 0) {
      throw new Error('Missing prefix for ' + str)
    }
    const prefix = str.slice(0, split)
    const wordChars = str.slice(split + 1)
    if (wordChars.length < 6) {
      throw new Error('Data too short')
    }
    let chk = this._prefixChk(prefix)
    const words = []
    for (let i = 0; i < wordChars.length; ++i) {
      const c = wordChars.charAt(i)
      const v = this._ALPHABET_MAP[c]
      if (v === undefined) {
        throw new Error('Unknown character ' + c)
      }
      chk = this._polymodStep(chk) ^ v
      if (i + 6 >= wordChars.length) {
        continue
      }
      words.push(v)
    }
    if (chk !== 1) {
      throw new Error('Invalid checksum for ' + str)
    }
    return { prefix, words: new Uint8Array(words) }
  }

  /**
   * @param {number} pre
   * @returns {number}
   * @private
   */
  static _polymodStep (pre) {
    const b = pre >> 25
    return ((pre & 0x1FFFFFF) << 5) ^
      (-((b >> 0) & 1) & 0x3b6a57b2) ^
      (-((b >> 1) & 1) & 0x26508e6d) ^
      (-((b >> 2) & 1) & 0x1ea119fa) ^
      (-((b >> 3) & 1) & 0x3d4233dd) ^
      (-((b >> 4) & 1) & 0x2a1462b3)
  }

  /**
   * @param {string} prefix
   * @returns {number}
   * @throws {Error}
   * @private
   */
  static _prefixChk (prefix) {
    let chk = 1
    for (let i = 0; i < prefix.length; ++i) {
      const c = prefix.charCodeAt(i)
      if (c < 33 || c > 126) {
        throw Error('Invalid prefix (' + prefix + ')')
      }
      chk = this._polymodStep(chk) ^ (c >> 5)
    }
    chk = this._polymodStep(chk)
    for (let i = 0; i < prefix.length; ++i) {
      const v = prefix.charCodeAt(i)
      chk = this._polymodStep(chk) ^ (v & 0x1f)
    }
    return chk
  }

  /**
   * @param {number[]|Uint8Array} data
   * @param {number} inBits
   * @param {number} outBits
   * @param {boolean} pad
   * @returns {number[]}
   * @private
   */
  static _convert (data, inBits, outBits, pad) {
    let value = 0
    let bits = 0
    const maxV = (1 << outBits) - 1
    const result = []
    for (let i = 0; i < data.byteLength; i++) {
      value = (value << inBits) | data[i]
      bits += inBits
      while (bits >= outBits) {
        bits -= outBits
        result.push((value >> bits) & maxV)
      }
    }
    if (pad) {
      /* istanbul ignore else */
      if (bits > 0) {
        result.push((value << (outBits - bits)) & maxV)
      }
    } else {
      if (bits >= inBits) {
        throw new Error('Excess padding')
      }
      if ((value << (outBits - bits)) & maxV) {
        throw new Error('Non-zero padding')
      }
    }
    return result
  }
}
/**
 * Базовый класс для работы с публичными ключами.
 * @class
 */
class PublicKey {
  /**
   * @param {Uint8Array} bytes Публичный ключ в формате libsodium, 32 байта (256 бит).
   * @throws {Error}
   */
  constructor (bytes) {
    /**
     * Публичный ключ в бинарном виде. В формате libsodium.
     * @type {Uint8Array}
     * @private
     */
    this._bytes = new Uint8Array(PublicKey.LENGTH)
    if (!(bytes instanceof Uint8Array)) {
      throw new Error('bytes must be Uint8Array')
    }
    if (bytes.byteLength !== PublicKey.LENGTH) {
      throw new Error('bytes must be 32 bytes length')
    }
    this._bytes.set(bytes)
  }

  /**
   * Длина публичного ключа в формате libsodium в байтах.
   * @type {number}
   * @constant
   */
  static get LENGTH () { return Ed25519.PUBLIC_KEY_BYTES }
  /**
   * Длина цифровой подписи в байтах.
   * @type {number}
   * @constant
   */
  static get SIGNATURE_LENGTH () { return Ed25519.SIGNATURE_BYTES }
  /**
   * Длина цифровой подписи в байтах.
   * @type {number}
   * @constant
   */
  get signatureLength () { return PublicKey.SIGNATURE_LENGTH }
  /**
   * Публичный ключ в формате libsodium, 32 байта (256 бит).
   * @type {Uint8Array}
   * @readonly
   */
  get bytes () {
    const b = new Uint8Array(this._bytes.byteLength)
    b.set(this._bytes)
    return b
  }

  /**
   * Проверяет цифровую подпись.
   * @param {Uint8Array} signature Подпись, 64 байта.
   * @param {Uint8Array} message Сообщение
   * @returns {boolean}
   * @throws {Error}
   * @example
   * let key = new Uint8Array(32)
   * let sig = new Uint8Array(64)
   * let msg = new Uint8Array(1)
   * let ver = new PublicKey(key).verifySignature(sig, msg)
   */
  verifySignature (signature, message) {
    if (!(signature instanceof Uint8Array)) {
      throw new Error('signature type must be Uint8Array')
    }
    if (signature.byteLength !== PublicKey.SIGNATURE_LENGTH) {
      throw new Error('signature length must be 64 bytes')
    }
    if (!(message instanceof Uint8Array)) {
      throw new Error('message type must be Uint8Array')
    }
    return new Ed25519().verify(signature, message, this._bytes)
  }
}
/**
 * Базовый класс для работы с приватными ключами.
 * @class
 */
class SecretKey {
  /**
   * @param {Uint8Array} bytes Приватный ключ в бинарном виде.
   * В формате libsodium, 64 байта (512 бит).
   * @throws {Error}
   */
  constructor (bytes) {
    /**
     * Приватный ключ в бинарном виде. В формате libsodium.
     * @type {Uint8Array}
     * @private
     */
    this._bytes = new Uint8Array(SecretKey.LENGTH)
    if (!(bytes instanceof Uint8Array)) {
      throw new Error('bytes type must be Uint8Array')
    }
    if (bytes.byteLength !== SecretKey.LENGTH) {
      throw new Error('bytes length must be 64 bytes')
    }
    this._bytes.set(bytes)
  }

  /**
   * Длина приватного ключа в формате libsodium в байтах.
   * @type {number}
   */
  static get LENGTH () { return Ed25519.SECRET_KEY_BYTES }
  /**
   * Приватный ключ в бинарном виде. В формате libsodium, 64 байта (512 бит).
   * @type {Uint8Array}
   * @readonly
   */
  get bytes () {
    const b = new Uint8Array(this._bytes.byteLength)
    b.set(this._bytes)
    return b
  }

  /**
   * Публичный ключ, соотвествующий приватному ключу.
   * @type {PublicKey}
   * @readonly
   */
  get publicKey () {
    return new PublicKey(new Ed25519().publicKeyFromSecretKey(this._bytes))
  }

  /**
   * Создает цифровую подпись сообщения.
   * @param {Uint8Array} message Сообщение, которое необходимо подписать.
   * @returns {Uint8Array} Цифровая подпись длиной 64 байта (512 бит).
   * @throws {Error}
   * @example
   * let seed = new Uint8Array(32)
   * let msg = new Uint8Array(1)
   * let sig = SecretKey.fromSeed(seed).sign(msg)
   */
  sign (message) {
    if (!(message instanceof Uint8Array)) {
      throw new Error('message type must be Uint8Array')
    }
    return new Ed25519().sign(message, this._bytes)
  }

  /**
   * Статический фабричный метод, создающий приватный ключ из seed.
   * Libsodium принимает seed длиной 32 байта (256 бит), если длина
   * отличается, то берется sha256 хэш.
   * @param {Uint8Array} seed Seed длиной от 0 до 128 байт.
   * @returns {SecretKey}
   * @throws {Error}
   * @example
   * let seed = new Uint8Array(32)
   * let key = SecretKey.fromSeed(seed)
   */
  static fromSeed (seed) {
    if (!(seed instanceof Uint8Array)) {
      throw new Error('seed must be Uint8Array')
    }
    if (seed.byteLength > 128) {
      throw new Error('seed length must be not greater than 128 bytes')
    }
    if (seed.byteLength === Ed25519.SEED_BYTES) {
      return new SecretKey(new Ed25519().secretKeyFromSeed(seed))
    }
    return new SecretKey(new Ed25519().secretKeyFromSeed(sha256(seed)))
  }
}
/**
 * Базовый класс для работы с адресами.
 * @class
 */
class Address {
  /**
   * @param {Uint8Array} [bytes] Адрес в бинарном виде, длина 34 байта.
   * @throws {Error}
   */
  constructor (bytes) {
    /**
     * Адрес в бинарном виде, длина 34 байта.
     * @type {Uint8Array}
     * @private
     */
    this._bytes = new Uint8Array(Address.LENGTH)
    if (bytes === undefined) {
      this.version = Address.Umi
    } else {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('bytes type must be Uint8Array')
      }
      if (bytes.byteLength !== Address.LENGTH) {
        throw new Error('bytes length must be 34 bytes')
      }
      this._bytes.set(bytes)
    }
  }

  /**
   * Длина адреса в байтах.
   * @type {number}
   * @constant
   */
  static get LENGTH () { return 34 }
  /**
   * Версия Genesis-адрса.
   * @type {number}
   * @constant
   */
  static get Genesis () { return 0 }
  /**
   * Версия Umi-адреса.
   * @type {number}
   * @constant
   */
  static get Umi () { return 21929 }
  /**
   * Адрес в бинарном виде, длина 34 байта.
   * @type {Uint8Array}
   * @readonly
   */
  get bytes () {
    const b = new Uint8Array(this._bytes.byteLength)
    b.set(this._bytes)
    return b
  }

  /**
   * Версия адреса, префикс в числовом виде.
   * @type {number}
   * @throws {Error}
   */
  get version () {
    return new DataView(this._bytes.buffer).getUint16(0)
  }

  set version (version) {
    versionToPrefix(version)
    new DataView(this._bytes.buffer).setUint16(0, (version & 0x7FFF))
  }

  /**
   * Устанавливает версию адреса и возвращяет this.
   * @param {number} version Версия адреса.
   * @returns {Address}
   * @throws {Error}
   */
  setVersion (version) {
    this.version = version
    return this
  }

  /**
   * Публичный ключ.
   * @type {PublicKey}
   * @throws {Error}
   */
  get publicKey () {
    return new PublicKey(this._bytes.subarray(2))
  }

  set publicKey (publicKey) {
    if (!(publicKey instanceof PublicKey)) {
      throw new Error('publicKey type must be PublicKey')
    }
    this._bytes.set(publicKey.bytes, 2)
  }

  /**
   * Устанавливает публичный ключи и возвращяет this.
   * @param {PublicKey} publicKey Публичный ключ.
   * @returns {Address}
   * @throws {Error}
   */
  setPublicKey (publicKey) {
    this.publicKey = publicKey
    return this
  }

  /**
   * Префикс адреса, три символа латиницы в нижнем регистре.
   * @type {string}
   * @throws {Error}
   */
  get prefix () {
    return versionToPrefix(this.version)
  }

  set prefix (prefix) {
    this.version = prefixToVersion(prefix)
  }

  /**
   * Устанавливает префикс адреса и возвращяет this.
   * @param {string} prefix Префикс адреса, три символа латиницы в нижнем регистре.
   * @returns {Address}
   * @throws {Error}
   */
  setPrefix (prefix) {
    this.prefix = prefix
    return this
  }

  /**
   * Адрес в формате Bech32, длина 62 символа.
   * @type {string}
   * @throws {Error}
   */
  get bech32 () {
    return Bech32.encode(this._bytes)
  }

  set bech32 (bech32) {
    if (typeof bech32 !== 'string') {
      throw new Error('bech32 type must be a string')
    }
    this._bytes.set(Bech32.decode(bech32))
  }

  /**
   * Устанавливает адрес в формате Bech32.
   * @param {string} bech32 Адрес в формате Bech32, длина 62 символа.
   * @returns {Address}
   * @throws {Error}
   */
  setBech32 (bech32) {
    this.bech32 = bech32
    return this
  }

  /**
   * Статический фабричный метод, создающий объект из адреса в формате Bech32.
   * @param {string} bech32 Адрес в формате Bech32, длина 62 символа.
   * @returns {Address}
   * @throws {Error}
   */
  static fromBech32 (bech32) {
    return new Address().setBech32(bech32)
  }

  /**
   * Статический фабричный метод, создающий объект из публичного или приватного ключа.
   * @param {PublicKey|SecretKey} key Публичный или приватный ключ.
   * @returns {Address}
   * @throws {Error}
   */
  static fromKey (key) {
    if (key instanceof SecretKey) {
      return new Address().setPublicKey(key.publicKey)
    }
    if (key instanceof PublicKey) {
      return new Address().setPublicKey(key)
    }
    throw new Error('key type must be PublicKey or SecretKey')
  }
}
/**
 * Базовый класс для работы с блоками.
 * @class
 */
class Block {
}
/**
 * Базовый класс для работы с заголовками блоков.
 * @class
 */
class BlockHeader {
}

exports.Address = Address
exports.Block = Block
exports.BlockHeader = BlockHeader
exports.PublicKey = PublicKey
exports.SecretKey = SecretKey
exports.Transaction = Transaction
