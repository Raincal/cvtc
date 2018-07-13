import fs from 'fs'
import chalk from 'chalk'

const log = console.log

export async function injectCookiesFromFile (file) {
  let cb = async (_cookies) => {
    const _user = _cookies[_cookies.length - 1].name
    if (_user === this.user.email) {
      await this.page.setCookie(..._cookies)
      log(chalk.cyan('载入本地 cookie'))
    } else {
      log(chalk.yellow('新用户，重新登录'))
    }
  }

  fs.readFile(file, async (err, data) => {
    if (err) {
      log(chalk.yellow('cookie 不存在，前往登录'))
      return
    }

    let cookies = JSON.parse(data)
    await cb(cookies)
  })
}

/**
 * Write Cookies object to target JSON file
 * @param {string} targetFile
 */
export async function saveCookies (targetFile) {
  let cookies = await this.page.cookies()
  cookies.push({
    name: this.user.email,
    value: JSON.stringify(this.user),
    domain: '.cvtc.edu',
    path: '/'
  })
  log(chalk.cyan('保存 cookie 到本地'))
  return saveToJSONFile(cookies, targetFile)
}

/**
 * Write JSON object to specified target file
 * @param {string} jsonObj
 * @param {string} targetFile
 */
export async function saveToJSONFile (jsonObj, targetFile) {
  return new Promise((resolve, reject) => {
    try {
      var data = JSON.stringify(jsonObj)
      // log("Saving object '%s' to JSON file: %s", data, targetFile)
    } catch (err) {
      log('Could not convert object to JSON string ! ' + err)
      reject(err)
    }

    // Try saving the file.
    fs.writeFile(targetFile, data, (err, text) => {
      if (err) reject(err)
      else {
        resolve(targetFile)
      }
    })
  })
}

/**
 * Get JSON object from local file
 * @param {string} file
 */
export function getDataFromFile (file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, data) => {
      if (err) reject(err)
      else {
        let jsonObj = JSON.parse(data)
        resolve(jsonObj)
      }
    })
  })
}
