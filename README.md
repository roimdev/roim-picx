# roim-picx

### 预览地址
[roim-picx](https://roim.page)
> 该系统仅作为预览使用，每天有使用限额，请勿大量上传图片。不要使用该图床的地址作为生产使用，因为要定时删除。

### 一款基于Cloudflare的Worker、R2、Pages实现的图床应用，具有以下特点：
* 10GB的免费存储空间
* 每月300W次的不计流量的图片访问，每天10W的限制。
* 每月100W次的图片上传次数
* 不需要自己购买服务器，克隆代码后部署CloudFlare即可使用。
* 独立部署不需要担心被第三方删除数据。

## Token
> 4xVSYkCKw2ExbPNEaMPjCnaaOowU9sTf

### 已实现功能
* 图片批量上传
* 图片列表查询
* 图片删除
* 目录创建
* 按目录查询
* 链接地址点击复制
* 简单的身份认证功能，进入管理页面需要授权

### TODO
* 上传时支持选择目录。
* 提供删除图片的访问链接
* 管理页面支持分页加载图片

### 使用教程
1. fork项目到自己的github

2. 注册CloudFlare并开通R2服务
   ![Upload](https://oss.tuqu.me/roim/blog/cf/r2.png)

3. 找到Pages选项并且创建项目
   ![Upload](https://oss.tuqu.me/roim/blog/cf/pages1.png)

4. 选择项目创建方式
   ![Upload](https://oss.tuqu.me/roim/blog/cf/pages2.png)

5. 链接Github或GitLab并选需要构建的项目
   ![Upload](https://oss.tuqu.me/roim/blog/cf/pages3.png)
   ![Upload](https://oss.tuqu.me/roim/blog/cf/pages4.png)

   链接到仓库后,,选择`Vue框架预设`,,保存并部署

   <img src="https://s2.loli.net/2024/06/25/WZKh6XdIOvSHMLD.png" alt="image-20240625125904324" style="zoom:25%;" />

6. 设置环境变量`BASE_URL`

   <img src="https://s2.loli.net/2024/06/25/b7nU62XQANzuYjG.png" alt="image-20240625125627118" style="zoom:25%;" />

7. 设置项目的函数信息，绑定R2和KV服务
   <img src="https://s2.loli.net/2024/06/25/iZIyafXTYenpmtw.png" alt="image-20240625125529675" style="zoom:25%;" />

   ```typescript
   // 请确保变量名与`functions/rest/[[path]].ts`中一致
   // ./functions/rest/[[path]].ts
   
   export interface Env {
     BASE_URL: string
     XK: KVNamespace
     PICX: R2Bucket
   }
   ```

   > 注意：Pages的函数变量名称需要于项目的变量名称一致，如果需要修改functions里面的Env名空间，对应的文件是`[[path]].ts`

8. 设置`PICX_AUTH_TOKEN`

   前往绑定的KV中，添加`PICX_AUTH_TOKEN`条目，填写Token

   <img src="https://s2.loli.net/2024/06/25/q6VGMuQxsZ7gojA.png" alt="image-20240625130106257" style="zoom: 25%;" />

9. 重试部署，提示成功即可使用


### 图床截图
![Upload](https://oss.tuqu.me/roim/blog/5.png)
![Preview](https://oss.tuqu.me/roim/blog/1.png)
![HTML](https://oss.tuqu.me/roim/blog/2.png)
![Markdown](https://oss.tuqu.me/roim/blog/3.png)
![Link](https://oss.tuqu.me/roim/blog/4.png)
![Manage](https://oss.tuqu.me/roim/blog/6.png)

### 项目参考来源
[1. cfworker-kv-image-hosting](https://github.com/realByg/cfworker-kv-image-hosting)

[2. HikariSearch](https://github.com/mixmoe/HikariSearch)
