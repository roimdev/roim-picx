# roim-picx

### 预览地址
[roim-picx](https://pigx.tuqu.me)
> 该系统仅作为预览使用，每天有使用限额，请勿大量上传图片。不要使用该图床的地址作为生产使用，因为要定时删除。

### 一款基于Cloudflare的Worker、R2、Pages实现的图床应用，具有以下特点：
* 10GB的免费存储空间
* 每月300W次的不计流量的图片访问，每天10W的限制。
* 每月100W次的图片上传次数
* 不需要自己购买服务器，克隆代码后部署CloudFlare即可使用。
* 独立部署不需要担心被第三方删除数据。

### 已实现功能
* 图片批量上传
* 图片列表查询
* 图片删除
* 目录创建
* 按目录查询
* 链接地址点击复制

### TODO
* 简单的身份认证功能，进入管理页面需要授权
* 上传时支持选择目录。
* 提供删除图片的访问链接
* 管理页面支持分页加载图片

### 使用教程

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
