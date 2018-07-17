import fs from 'fs'
import _ from 'ramda'
import dayjs from 'dayjs'
import chalk from 'chalk'
import puppeteer from 'puppeteer'

import users from './data/user.json'
import {
  inputSelector,
  loginInputSelector,
  appInputSelector,
  selectSelector,
  appSelectSelector,
  getRandomTerm,
  getRandomProgram,
  getRandomCounty,
  getRandomDistrict,
  getRandomGraduationDate,
  getRandomHCR
} from './helper.mjs'
import { saveCookies, injectCookiesFromFile } from './utils.mjs'

const log = console.log

export default class Cvtc {
  constructor (user) {
    this.user = user
    this.browser = null
    this.page = null
    this.saveCookies = saveCookies.bind(this)
    this.injectCookiesFromFile = injectCookiesFromFile.bind(this)
  }

  async _lanchBrowser (flag = true) {
    this.browser = await puppeteer.launch({ headless: flag })
    this.page = await this.browser.newPage()
    await this.page.setViewport({
      width: 1024,
      height: 900
    })
    await this.page.setDefaultNavigationTimeout(60000)
  }

  async _saveUser () {
    const newUsers = _.unionWith(_.eqBy(_.prop('email')), [this.user], users)
    fs.writeFileSync(
      './data/user.json',
      JSON.stringify(newUsers, null, 2),
      'utf8'
    )
  }

  async createAccount () {
    const url =
      'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/createaccount.aspx'
    const successUrl =
      'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/MyAccount.aspx'

    if (!this.page) await this._lanchBrowser(false)

    let { user, page } = this
    await page.goto(url, { waitUntil: 'load' })

    await page.type(inputSelector('firstname'), user.first)
    await page.type(inputSelector('lastname'), user.last)
    await page.type(inputSelector('emailaddress1'), user.email)
    await page.type(inputSelector('datatel_emailaddress1_confirm'), user.email)
    await page.type(inputSelector('address1_telephone1'), user.phone)
    await page.type(inputSelector('address1_line1'), user.address)
    await page.type(inputSelector('address1_city'), user.city)
    await page.type(inputSelector('address1_postalcode'), user.zip)

    await page.type(selectSelector('datatel_stateprovinceid'), user.state)
    await page.select(
      selectSelector('elcn_anticipatedentrytermid'),
      getRandomTerm()
    )
    await page.select(
      selectSelector('elcn_academicprogramofinterestid'),
      getRandomProgram()
    )

    await page.type(inputSelector('membership_password'), user.password)
    await page.type(inputSelector('membership_confirmpassword'), user.password)
    await page.type(
      inputSelector('membership_passwordquestion'),
      'What is your name?'
    )
    await page.type(
      inputSelector('membership_passwordanswer'),
      user.first + ' ' + user.last
    )

    await page.click('input[type="submit"]')

    await page.waitFor(3000)

    const ret = (await page.url()) === successUrl

    if (ret) {
      user.registered = true
      user.registered_date = dayjs().toISOString()
      await this._saveUser(user)
    }

    return ret
  }

  async _isLogin () {
    const myAccountUrl = 'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/MyAccount.aspx'
    if (!this.page) await this._lanchBrowser(false)

    await this.page.goto(myAccountUrl, { waitUntil: 'load' })

    return await this.page.url() === myAccountUrl
  }

  async login () {
    const url =
      'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/Welcome.aspx'
    const successUrl =
      'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/MyAccount.aspx'

    if (!this.page) await this._lanchBrowser(false)

    let { user, page } = this

    log(chalk.blue('正在登录中...'))

    await this.injectCookiesFromFile('./data/cookies.json')

    const isUserLogin = await this._isLogin()

    if (isUserLogin) {
      log(chalk.green(`${user.email} 已登录`))
      await this.saveCookies('./data/cookies.json')
      try {
        await this.createApplication()
      } catch (error) {
        log(chalk.red('遇到错误，重新创建应用'))
        await this.createApplication()
      }
    } else {
      await page.goto(url, { waitUntil: 'load' })

      await page.type(loginInputSelector('UserName'), user.email)
      await page.type(loginInputSelector('Password'), user.password)

      await page.click('input[type="submit"]')

      await page.waitFor(5000)

      const ret = (await page.url()) === successUrl

      if (ret) {
        log(chalk.green(`${user.email} 登录成功`))
        await this.saveCookies('./data/cookies.json')
      }

      await this.createApplication()

      return ret
    }
  }

  async _clearInput (selector) {
    const inputHandle = await this.page.$(appInputSelector(selector))
    await this.page.evaluate(input => {
      input.value = ''
    }, inputHandle)
    await inputHandle.dispose()
  }

  async _nextStep (timeout) {
    await this.page.click('.NextButton')
    await this.page.waitFor(timeout)
  }

  // https://github.com/GoogleChrome/puppeteer/issues/545#issuecomment-325212388
  async _isVisible (selecter) {
    const elHandle = await this.page.$(selecter)
    const ret = await this.page.evaluate((e) => {
      if (!e) { return false }
      const style = window.getComputedStyle(e)
      return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
    }, elHandle)
    return ret
  }

  async createApplication () {
    const url = 'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/MyAccount.aspx'
    let { user, page } = this

    if ((await page.url) !== url) await page.goto(url, { waitUntil: 'load' })
    const steps = await page.$$eval('.nextStepsImageCompleted', steps => steps.length)
    if (steps === 1) {
      await page.click('.nextStepsNameLabel')
      await page.waitFor(5000)
      await page.click('.startApp')
      await page.waitFor(5000)
      await page.click('.OppSelect')
      await page.waitFor(5000)
      await this.createApplication()
    } else if (steps === 2) {
      await page.click('.nextStepsNameLabel')
      await page.waitFor(5000)

      log(chalk.red('Personal'))
      await this._clearInput('datatel_birthdate')
      await page.type(appInputSelector('datatel_birthdate'), user.birth)
      await page.select(appSelectSelector('datatel_genderid'), user.gender === 'Male' ? '6761979e-a734-e611-80c2-005056ac2e56' : '6961979e-a734-e611-80c2-005056ac2e56')
      await page.select(appSelectSelector('datatel_admittypeid'), 'c3b87117-d360-e611-80c2-005056ac2e56')
      await page.select(appSelectSelector('cvtc_municipalities'), getRandomCounty())
      await this._clearInput('cvtc_cvtchighschooldistrict')
      await page.type(appInputSelector('cvtc_cvtchighschooldistrict'), getRandomDistrict())
      await this._clearInput('datatel_address1_telephone1')
      await this._nextStep(10000)

      log(chalk.red('Demographics'))
      await page.select(appSelectSelector('datatel_citizenshipstatusid'), 'f5116c26-d260-e611-80c2-005056ac2e56')
      await this._clearInput('datatel_ssn')
      await page.type(appInputSelector('datatel_ssn'), user.ssn)
      await this._nextStep(10000)

      log(chalk.red('Program Plans'))
      await page.evaluate(() => {
        document.querySelectorAll('select')[2].options[1].selected = true
      })
      await page.click('.NextButton')
      await page.waitFor(10000)

      log(chalk.red('Family'))
      await this._nextStep(10000)

      log(chalk.red('Educational History'))
      const clearButton = await this._isVisible('.OrganizationControlClearLink')
      if (!clearButton) {
        await page.click('.OrganizationControlSearchBtn')
        await page.waitFor(10000)
        await page.evaluate(() => {
          const randomNum = Math.floor(Math.random() * (50 - 2 + 1) + 2)
          document.querySelector(`.OrganizationControlResultsSection select option:nth-child(${randomNum})`).selected = true
        })
        await page.click('.OrganizationControlResultsSection .OrganizationControlSearchBtn')
        await page.waitFor(5000)
      }
      await this._clearInput('cvtc_cvtcgraduationdate')
      await page.type(appInputSelector('cvtc_cvtcgraduationdate'), getRandomGraduationDate())
      await page.select(appSelectSelector('cvtc_cvtcstudenthighestcredentialreceived'), getRandomHCR())
      await this._nextStep(10000)

      log(chalk.red('Signature'))
      for (let i = 0; i < 3; i++) {
        const checkbox = await page.$(appInputSelector(`datatel_certify${i + 1}`))
        await page.evaluate(checkbox => {
          checkbox.checked = true
        }, checkbox)
      }
      await this._clearInput('datatel_signature')
      await page.type(appInputSelector('datatel_signature'), user.first + ' ' + user.last)
      await page.click('#ctl00_mainContent_ApplicationForm_ApplicationForm_submitBtn')
      await page.waitFor(10000)

      await page.type('input[name="ctl00$mainContent$AppPaymentControl1$applicationPaymentControl$promocode"]', 'FBSAVE30')
      await page.click('.promocodebutton')
      await page.waitFor(10000)
      const finishedUrl = (await page.url()).split('?')[0]
      if (finishedUrl === 'https://rightchoice.cvtc.edu/Ellucian.ERecruiting.Web.External/Pages/ApplicationCompleted.aspx') {
        log(chalk.green('申请应用成功'))
        await this.createApplication()
      }
    } else {
      if (!this.user.has_application) {
        this.user.has_application = true
        await this._saveUser(this.user)
      }
      log(chalk.yellow(`${this.user.email} 已申请应用`))
      await this.browser.close()
    }
  }
}
