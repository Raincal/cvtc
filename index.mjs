import chalk from 'chalk'

import Cvtc from './cvtc.mjs'
import { getRandomUser } from './helper.mjs'
import users from './data/user.json'

async function main () {
  const user = users[0].has_application ? await getRandomUser() : users[0]
  const cvtc = new Cvtc(user)
  console.log(`${chalk.green('当前用户信息:\n')}`, user)
  try {
    if (!user.registered) {
      const ret = await cvtc.createAccount(user)
      if (ret) {
        console.log(`${user.email} 注册成功`)
        await cvtc.login(user)
      } else {
        console.log(chalk.red(`${user.email} 已存在或注册失败`))
      }
    } else {
      await cvtc.login(user)
    }
  } catch (error) {
    console.log(chalk.red(error))
  }
}

main()
