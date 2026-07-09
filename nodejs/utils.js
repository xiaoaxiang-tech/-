const fs = require("fs");
const path = require("path");

// 递归遍历文件夹
function scan(dir) {
  let htmlLines = 0;
  let cssLines = 0;
  let jsLines = 0;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // 文件夹：递归拿到子文件夹行数，累加进来
    if (stat.isDirectory()) {
      const childRes = scan(fullPath);
      // 注意：子层先返回行数，不是占比
      htmlLines += childRes.htmlLines;
      cssLines += childRes.cssLines;
      jsLines += childRes.jsLines;
      return;
    }

    const ext = path.extname(file).toLowerCase(); //拿到文件后缀名变成小写
    // 处理 html 拆分 style / script
    if (ext === ".html") {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");

      let inStyle = false;
      let inScript = false;

      lines.forEach((line) => {
        const trimLine = line.trim();
        if (!trimLine) return;

        if (trimLine.includes("<style>")) inStyle = true;
        if (trimLine.includes("</style>")) inStyle = false;

        if (trimLine.includes("<script>")) inScript = true;
        if (trimLine.includes("</script>")) inScript = false;

        if (inStyle) cssLines++;
        else if (inScript) jsLines++;
        else htmlLines++;
      });
    }

    // 单独 css 文件
    else if (ext === ".css") {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim()).length;
      cssLines += lines;
    }

    // 单独 js 文件
    else if (ext === ".js") {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim()).length;
      jsLines += lines;
    }
  });

  // 最顶层才算占比，子层只返回原始行数
  // 判断是不是最顶层（简单处理：可以固定最后统一算）
  // 方案：统一让递归返回行数，最后在外层包一层算占比
  return { htmlLines, cssLines, jsLines };
}

// 封装一层，对外直接返回占比对象
function getRate(folder) {
  const { htmlLines, cssLines, jsLines } = scan(folder);
  const total = htmlLines + cssLines + jsLines;
  return {
    html: ((htmlLines / total) * 100).toFixed(2) + "%",
    css: ((cssLines / total) * 100).toFixed(2) + "%",
    js: ((jsLines / total) * 100).toFixed(2) + "%",
  };
}
let dir = "./案列/前端案列";
let getFile = fs.readdirSync(dir);
let dataObj = [];
let mapArr = [
  {
    video: `http://localhost:3000/案列21.gif`,
    url: "http://localhost:3000/倒计时效果/index.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "20秒倒计时进度条动画",
      realize:
        "通过setInterval定时器实现20秒倒计时逻辑，根据总时长与定时器执行频次精准计算进度条递减宽度，同步更新页面倒计时数字，倒计时结束自动清除定时器，搭配CSS变量统一控制圆角样式，实现进度与时间同步的动态视觉效果。",
      Highlights:
        "利用CSS变量统一管理样式，通过比例算法让进度条与倒计时数字百分百同步，动画过渡流畅，原生代码实现零插件、兼容性强。",
      Challenges:
        "需要精准计算定时器执行次数与进度递减比例，处理定时器帧率微小误差，保证倒计时结束瞬间进度条刚好归零，避免进度与时间不同步问题。",
    },
  },
  {
    video: `http://localhost:3000/案列29.gif`,
    url: "http://localhost:3000/图片3D/index.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "鼠标跟随人物3D立体旋转效果",
      realize:
        "利用CSS透视属性perspective搭建3D立体空间，监听鼠标移动与离开事件，通过自定义数值映射公式，将鼠标容器坐标转化为X、Y轴旋转角度，实现图片跟随鼠标动态3D旋转，鼠标移出容器自动复位。",
      Highlights:
        "原生JS实现轻量化3D交互，通过数值映射实现视角平滑跟随，立体悬浮质感强，鼠标移入移出交互反馈及时丝滑。",
      Challenges:
        "需要对鼠标坐标进行精准区间映射约束旋转角度，解决鼠标快速移动造成的角度抖动问题，保证3D旋转效果自然不突兀。",
    },
  },
  {
    video: `http://localhost:3000/案列24.gif`,
    url: "http://localhost:3000/夯到拉排名/index.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "图片拖拽分级排名交互功能",
      realize:
        "运用CSS变量和Flex布局搭建五级排名布局，页面加载后异步批量渲染图片并实现入场动画，监听鼠标拖拽、抬起事件，实时检测拖拽落点区域，动态高亮悬浮层级，拖拽结束自动计算坐标并吸附至对应区域。",
      Highlights:
        "实现批量图片序列动画加载、拖拽悬浮区域高亮、拖拽结束自动吸附定位，交互逻辑完整连贯，状态切换流畅，用户体验佳。",
      Challenges:
        "通过Promise管控异步加载流程，利用Set集合精准管理高亮状态防冲突，精准计算元素偏移坐标，解决拖拽定位偏差、动画与拖拽动作衔接卡顿问题。",
    },
  },
  {
    video: `http://localhost:3000/案列22.gif`,
    url: "http://localhost:3000/对话效果/index.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "点击切换双人对话逐字打印效果",
      realize:
        "采用固定定位与毛玻璃样式构建底部对话面板，通过定时器实现文字逐字打印，点击页面切换对话角色，左右对话框交替显示，对话结束自动隐藏面板。",
      Highlights:
        "逐字打印动画流畅，对话框视觉美观，点击交互简单直观，支持自定义对话数据扩展。",
      Challenges:
        "控制定时器动画不重复触发，通过标志位管理状态，精准绑定索引与显示逻辑，避免动画冲突。",
    },
  },
  {
    video: `http://localhost:3000/案列25.gif`,
    url: "http://localhost:3000/将军消消乐/index.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "限时连连看消消乐互动游戏",
      realize:
        "结合倒计时进度条与图片消消乐核心玩法，通过洗牌算法随机打乱图片布局，玩家在限时内点击匹配相同图片消除，完成全部消除判定胜利，超时或失败触发对应音效与提示，支持游戏重新开始循环游玩。",
      Highlights:
        "融合倒计时机制、随机洗牌算法、图片匹配消除逻辑，搭配胜利/失败/提示音效增强沉浸感，界面交互简洁直观，游戏逻辑完整闭环。",
      Challenges:
        "精准控制倒计时与进度条同步逻辑，通过状态变量管理图片匹配与消除规则，处理游戏胜利/失败/重开的流程切换，避免重复点击与状态冲突问题。",
    },
  },
  {
    video: `http://localhost:3000/案列26.gif`,
    url: "http://localhost:3000/懒加载/index.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "IntersectionObserver无限滚动加载布局",
      realize:
        "使用CSS Grid网格布局搭建卡片容器，通过IntersectionObserver监听底部触发元素可视状态，当触发元素进入视口时自动批量创建并追加卡片DOM，实现滚动到底自动加载的无限列表效果。",
      Highlights:
        "采用原生交叉观察器实现高性能无限加载，无监听滚动事件性能损耗，Grid布局整齐美观，自动追加DOM逻辑简洁高效，页面流畅不卡顿。",
      Challenges:
        "正确配置IntersectionObserver监听规则，精准控制DOM创建与追加时机，避免重复触发加载逻辑，保证布局渲染稳定。",
    },
  },
  {
    video: `http://localhost:3000/案列27.gif`,
    url: "http://localhost:3000/手机信息推送/手机消息推送.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "模拟手机消息中心滑动交互体验",
      realize:
        "采用模块化开发搭建仿真手机界面，实现消息上下滑出面板、左右滑动删除单条消息、一键清空全部消息、定时自动推送通知并播放音效，通过虚拟DOM渲染消息列表，完整还原手机通知中心交互逻辑。",
      Highlights:
        "模块化架构清晰易维护，支持消息滑入滑出、左右滑动删除、批量清空动画、定时推送通知，界面采用毛玻璃效果，交互流畅还原真实手机操作体验。",
      Challenges:
        "精准控制多层级滑动冲突与边界值，处理鼠标拖拽、过渡动画、虚拟DOM渲染的同步逻辑，实现消息拖拽删除阈值判断，优化滑动手感与动画衔接流畅度。",
    },
  },
  {
    video: `http://localhost:3000/案列30.gif`,
    url: "http://localhost:3000/拖动一个元素/拖动一个元素.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "Grid布局图片拖拽交换位置交互",
      realize:
        "使用CSS Grid搭建4x4网格容器，通过原生HTML5拖拽API实现图片拖拽交换功能，监听拖拽开始、进入、放置、结束事件，动态添加高亮样式，完成两张图片位置互换的交互效果。",
      Highlights:
        "纯原生实现图片拖拽交换，网格布局整齐美观，拖拽目标高亮反馈，位置互换逻辑清晰，交互直观流畅。",
      Challenges:
        "正确处理HTML5拖拽事件流程，精准获取元素索引，通过临时变量实现图片源互换，控制高亮状态避免冲突与异常显示。",
    },
  },
  {
    video: `http://localhost:3000/案列36.gif`,
    url: "http://localhost:3000/拖拽元素位置交换/index.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "基于相交面积检测的拖拽排序与 FLIP 平滑交换",
      realize:
        "通过原生 JavaScript 监听鼠标事件，使用 transform 实现拖拽移动；利用 getBoundingClientRect 实时计算拖拽元素与所有兄弟元素的矩形相交面积，并选择面积最大的元素作为目标；拖拽过程中高亮目标元素，松开鼠标时采用 FLIP 技术（First → Last → Invert → Play）进行 DOM 顺序交换，并配合 CSS transition 实现平滑过渡动画",
      Highlights:
        "精准的碰撞检测（相交面积最大算法） 平滑自然的 FLIP 交换动画 支持任意数量的同级元素，自适应布局。实时高亮反馈，排他性管理 无目标时自动复位，交互完整",
      Challenges:
        "实时计算并比较多个元素的相交面积 处理拖拽过程中同时与多个元素相交时的目标选择，DOM 交换与 FLIP 动画的无缝结合 ，避免 transform 与布局属性的冲突，保持 flex 布局稳定，边界情况处理（如相邻元素交换、快速拖拽等）",
    },
  },
  {
    video: `http://localhost:3000/案列33.gif`,
    url: "http://localhost:3000/柚子社游戏/index.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "角色语音听音辨图闯关小游戏",
      realize:
        "实现双模式闯关游戏，玩家先聆听角色语音，在九宫格/四十九宫格中找出对应全部角色头像，支持头像悬停切换、语音播报、计时计分、胜负判定，完成闯关后自动返回主页重新开始。",
      Highlights:
        "双难度模式切换，头像悬停交互与语音反馈，随机生成宫格布局，实时计时闯关，胜负判定逻辑完整，游戏体验流畅。",
      Challenges:
        "精准匹配语音与角色对应关系，控制随机宫格必含正确答案，处理重复点击判定，计时与游戏状态同步管理。",
    },
  },
  {
    video: `http://localhost:3000/案列1.gif`,
    url: "http://localhost:3000/案例一/1.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "商品支付页面跳转与自动返回功能",
      realize:
        "搭建商品信息展示页与支付成功页，点击支付按钮跳转到成功页面，成功页开启5秒倒计时自动返回首页，同时支持手动点击按钮立即返回，完成完整支付闭环交互。",
      Highlights:
        "页面跳转逻辑清晰，倒计时自动返回+手动返回双功能，交互流程完整，符合真实支付页面体验。",
      Challenges:
        "精准控制倒计时逻辑与页面跳转时机，防止定时器异常导致跳转失败。",
    },
  },
  {
    video: `http://localhost:3000/案列7.gif`,
    url: "http://localhost:3000/案例七/敏感词过滤.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "文本敏感词过滤发布功能",
      realize:
        "通过正则表达式匹配预设敏感词库，对用户输入的文本内容进行检测替换，支持点击发布/回车发布，过滤后的内容自动展示到列表中，输入框自动清空。",
      Highlights:
        "全局不区分大小写匹配敏感词，一键替换为屏蔽符号，支持回车快捷发布，内容实时展示，使用体验简洁高效。",
      Challenges:
        "构建正则表达式全局匹配敏感词，处理空输入校验与键盘回车事件，保证过滤精准无遗漏。",
    },
  },
  {
    video: `http://localhost:3000/案列9.gif`,
    url: "http://localhost:3000/案例九/返回首屏.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "页面滚动返回顶部功能",
      realize:
        "监听页面滚动事件，当滚动距离超过400px时自动显示右侧固定返回按钮，点击按钮使用平滑滚动效果回到页面顶部，滚动距离不足时自动隐藏按钮。",
      Highlights:
        "滚动显示/隐藏自动切换，平滑滚动体验流畅，按钮固定定位不遮挡内容，功能轻量化且实用。",
      Challenges:
        "准确获取页面滚动距离，控制按钮显隐时机，实现原生平滑滚动效果。",
    },
  },
  {
    video: `http://localhost:3000/案列2.gif`,
    url: "http://localhost:3000/案例二/随机生成验证码.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "随机验证码生成与验证功能",
      realize:
        "通过JS随机生成6位大小写字母+数字组合的验证码，支持点击切换刷新验证码，输入后点击确定进行匹配校验，给出成功/失败提示，验证失败自动清空输入框。",
      Highlights:
        "一键刷新验证码、输入非空校验、精准字符匹配、交互提示完整，逻辑简单易用，体验贴近真实网站验证流程。",
      Challenges:
        "生成随机且不重复的6位混合字符，处理输入框空值判断，保证验证码匹配校验精准无误。",
    },
  },
  {
    video: `http://localhost:3000/案列5.gif`,
    url: "http://localhost:3000/案例五/全选反选.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "复选框全选、全不选、反选交互功能",
      realize:
        "通过原生JS实现复选框组的三大控制功能，点击对应按钮可一键全选、全不选或对所有选项进行反选，操作实时生效，交互直观简洁。",
      Highlights:
        "按钮逻辑清晰，执行效率高，无需依赖即可实现完整的复选框批量控制，是表单常用基础功能。",
      Challenges:
        "准确遍历复选框集合，正确切换checked状态，保证反选逻辑无误、所有按钮响应正常。",
    },
  },
  {
    video: `http://localhost:3000/案列17.gif`,
    url: "http://localhost:3000/案例十七/轮播图.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "无缝轮播图（带指示器、左右切换、自动播放）",
      realize:
        "采用克隆首尾图片实现无缝滚动效果，通过transform+transition实现平滑切换，支持左右按钮切换、底部指示器点击跳转、自动轮播，鼠标悬停暂停、离开继续播放。",
      Highlights:
        "真正无缝无卡顿切换，指示器同步高亮，自动/手动/点击控制三合一，交互完整，视觉流畅，是企业级轮播标准实现。",
      Challenges:
        "克隆节点构造无缝结构，处理边界瞬间复位与过渡动画冲突，精准维护索引与指示器同步，解决轮播闪烁与错位问题。",
    },
  },
  {
    video: `http://localhost:3000/案列13.gif`,
    url: "http://localhost:3000/案例十三/学生信息表的增加和删除.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "学生信息增删管理系统",
      realize:
        "搭建表单录入界面，实现学生信息添加、表格展示、单行删除功能，提交前自动校验输入非空，添加完成后清空输入框，数据通过数组管理并实时渲染表格。",
      Highlights:
        "完整增删逻辑，非空校验保障数据有效性，数据与视图同步更新，操作简洁直观，是典型的前端CRUD小案例。",
      Challenges:
        "精准绑定数据索引与删除操作，处理表单默认提交行为，保证数组更新后页面正确重新渲染。",
    },
  },
  {
    video: `http://localhost:3000/案列15.gif`,
    url: "http://localhost:3000/案例十五/新浪热榜.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "百度热榜随机展示切换功能",
      realize:
        "从外部数据模块导入热榜数据，页面初始化时随机抽取8条展示，点击换一换按钮重新随机刷新列表，实现热榜数据动态切换展示效果。",
      Highlights:
        "模块化数据管理，随机抽取不重复展示，一键刷新体验流畅，布局简洁还原热榜样式。",
      Challenges:
        "通过随机数实现数据随机抽取渲染，保证每次刷新展示不同内容，数组与视图同步更新。",
    },
  },
  {
    video: `http://localhost:3000/案列18.gif`,
    url: "http://localhost:3000/案例十八/放大镜.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "图片放大镜预览交互效果",
      realize:
        "鼠标移入小图区域时显示半透明遮罩层，跟随鼠标移动并限制在图片范围内，通过坐标比例计算实现右侧大图同步放大预览，鼠标移出后自动隐藏所有效果。",
      Highlights:
        "遮罩层跟随鼠标精准移动，大图按比例联动放大，边界自动限制不超出，视觉直观、放大预览流畅，符合电商图片查看体验。",
      Challenges:
        "精准计算鼠标坐标与遮罩偏移量，按比例映射大图移动位置，处理边界值防止遮罩层溢出小图区域。",
    },
  },
  {
    video: `http://localhost:3000/案列14.gif`,
    url: "http://localhost:3000/案例十四/三级菜单.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "三级折叠菜单展开收起交互",
      realize:
        "实现一级菜单点击切换二级菜单显示隐藏，二级菜单对应项点击后，三级菜单根据索引动态计算位置并展示，形成完整三级折叠菜单交互效果。",
      Highlights:
        "菜单层级清晰，动态计算三级菜单定位，点击切换逻辑简洁，展开收起状态可控，视觉层次分明。",
      Challenges:
        "根据二级菜单索引精准计算三级菜单的垂直位置，控制菜单显隐状态不冲突，实现层级切换流畅。",
    },
  },
  {
    video: `http://localhost:3000/案列4.gif`,
    url: "http://localhost:3000/案例四/tab切换.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "鼠标悬停切换图片选项卡效果",
      realize:
        "通过鼠标悬停对应分类标签，实时切换展示区图片并高亮当前选项，实现无点击、纯悬停的图片切换选项卡交互。",
      Highlights:
        "响应灵敏、切换流畅，选项自动高亮，操作直观，结构简洁适合商品分类展示。",
      Challenges:
        "精准绑定索引与图片路径，循环清除其他选项样式，保证切换无冲突。",
    },
  },
  {
    video: `http://localhost:3000/案列3.gif`,
    url: "http://localhost:3000/案列三/搜索建议.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "课程模糊搜索实时匹配功能",
      realize:
        "输入框聚焦时展示课程列表，输入内容后通过防抖+正则模糊匹配课程，实时显示匹配结果，无匹配时提示“没有找到”，失焦自动关闭列表。",
      Highlights:
        "输入防抖优化性能，不区分大小写模糊搜索，匹配结果实时显示，无数据友好提示，体验接近真实搜索框。",
      Challenges:
        "使用防抖减少频繁触发，正则全局模糊匹配，精准控制匹配项显示与隐藏，处理无结果状态。",
    },
  },
  {
    video: `http://localhost:3000/案列20.gif`,
    url: "http://localhost:3000/案列二十/deepseek优化的飞机移动.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "无缝背景飞机操控小游戏",
      realize:
        "使用CSS动画实现背景无缝向下滚动，通过面向对象（Class）搭建游戏框架，支持方向键控制飞机上下左右移动，飞机移动受边界限制不超出屏幕，采用requestAnimationFrame实现流畅渲染。",
      Highlights:
        "背景无限循环滚动，键盘多键响应，边界碰撞检测，面向对象结构清晰，游戏流畅度高，具备完整小游戏核心体验。",
      Challenges:
        "使用requestAnimationFrame保证运动平滑，精准计算飞机移动边界，处理键盘事件与移动逻辑同步，实现无缝背景循环。",
    },
  },
  {
    video: `http://localhost:3000/案列8.gif`,
    url: "http://localhost:3000/案列八/进度条.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "5秒进度条加载动画效果",
      realize:
        "点击安装按钮后，进度条在5秒内从0平滑填充到100%，实时计算并显示百分比数字，加载完成后自动停止定时器，完成完整进度展示效果。",
      Highlights:
        "进度条过渡流畅，百分比实时同步显示，视觉直观清晰，按钮触发逻辑简单，接近真实安装/加载交互。",
      Challenges:
        "通过宽度比例精准计算加载百分比，保证进度数值与视觉填充同步，正确控制定时器启停避免异常。",
    },
  },
  {
    video: `http://localhost:3000/案列6.gif`,
    url: "http://localhost:3000/案列六/相册切换.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "缩略图悬停切换大图预览功能",
      realize:
        "页面布局包含大图展示区和底部缩略图列表，鼠标悬停在任意缩略图上，上方大图自动切换为对应图片，实现预览切换效果。",
      Highlights:
        "纯鼠标悬停触发、无需点击，切换响应快速，图片路径与索引精准绑定，布局简洁直观，适合图片预览场景。",
      Challenges:
        "正确绑定缩略图索引与图片路径，确保切换路径准确，循环事件不冲突、切换无延迟。",
    },
  },
  {
    video: `http://localhost:3000/案列10.gif`,
    url: "http://localhost:3000/案列十/电影选座.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "影院座位选择交互系统",
      realize:
        "使用CSS Grid布局搭建6×6座位矩阵，用户点击座位可切换选中/未选中状态，选中时高亮并显示文字提示，再次点击取消选择，实现座位预选功能。",
      Highlights:
        "网格布局整齐还原影院座位，点击切换状态直观，选中效果醒目，交互简单易懂，是购票选座核心功能。",
      Challenges:
        "精准判断座位当前状态并做反向切换，正确添加/移除样式与文字提示，无冗余逻辑。",
    },
  },
  {
    video: `http://localhost:3000/案列11.gif`,
    url: "http://localhost:3000/案列十一/移动的小盒子.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "方块左右来回自动移动动画",
      realize:
        "点击开始按钮后，红色方块在页面内左右匀速往返移动，碰到左右边界自动反弹换向，点击结束按钮立即停止运动，实现平滑往复移动效果。",
      Highlights:
        "自动边界反弹、移动流畅稳定，开始/结束控制完整，是原生JS运动经典案例。",
      Challenges:
        "精准计算移动边界值，正确控制速度正负实现反弹换向，防止定时器叠加导致运动异常。",
    },
  },
  {
    video: `http://localhost:3000/案列19.gif`,
    url: "http://localhost:3000/案列十九/购物车.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "购物车商品数量计算与全选功能",
      realize:
        "实现购物车完整功能，支持商品数量增减、小计自动计算、单选/全选统计总价、删除商品，数据实时同步并更新总金额，表单状态与数据联动。",
      Highlights:
        "数量增减、小计自动核算、单选全选、总计实时统计、删除刷新功能齐全，是电商核心前端逻辑案例。",
      Challenges:
        "精准维护数据与视图同步，正确统计选中商品总价，处理全选与反选逻辑，删除后自动重新渲染。",
    },
  },
  {
    video: `http://localhost:3000/案列12.gif`,
    url: "http://localhost:3000/案列十二/鼠标导航器.html",
    difflty: "简单",
    color: "rgb(28, 186, 199)",
    demoexplain: {
      title: "鼠标跟随移动方块效果",
      realize:
        "监听页面鼠标移动事件，实时获取鼠标坐标，通过计算让红色方块中心点始终跟随鼠标移动，实现无延迟鼠标追踪效果。",
      Highlights:
        "鼠标移动响应极快、方块平滑跟随，中心点精准对齐，纯原生JS实现，代码简洁高效。",
      Challenges:
        "通过offsetWidth/2修正偏移量，确保方块中心跟随鼠标，避免位置偏差。",
    },
  },
  {
    video: `http://localhost:3000/案列16.gif`,
    url: "http://localhost:3000/案列十六/随机抽奖.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "九宫格随机抽奖转盘效果",
      realize:
        "点击中间开始按钮后，九宫格周围奖项快速随机高亮闪烁，模拟抽奖滚动效果，持续一段时间后自动停止，最终高亮显示中奖者。",
      Highlights:
        "视觉抽奖效果逼真，随机高亮切换流畅，防止重复点击加速，交互完整有趣。",
      Challenges:
        "控制定时器随机切换样式，防止多次点击叠加，实现自动停止并锁定最终中奖项。",
    },
  },
  {
    video: `http://localhost:3000/案列31.gif`,
    url: "http://localhost:3000/王者抽奖案列/王者抽奖案列.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "王者荣耀积分夺宝抽奖系统（完整UI+动画）",
      realize:
        "还原王者荣耀积分夺宝玩法，支持抽1次/5次，外圈奖品高亮旋转动画，随机掉落奖品弹窗展示，幸运值进度条累加，200满值后清空，奖品弹窗带渐入/旋转/弹跳动画，可继续抽或确认结束，全程按钮防重复点击。",
      Highlights:
        "视觉高度还原游戏UI，多组合CSS动画流畅，异步抽奖流程完整，幸运值+进度条双反馈，奖品弹窗动画分层递进，交互体验接近官方。",
      Challenges:
        "环形奖品顺序高亮、异步连续抽奖（5连抽）、动画延迟队列、幸运值满200自动清零、定时器防叠加、弹窗动态渲染奖品。",
    },
  },
  {
    video: `http://localhost:3000/案列35.gif`,
    url: "http://localhost:3000/自定义滚动条/index.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "自定义右侧滚动条（内容跟随拖动+滚轮控制）",
      realize:
        "原生JS实现自定义滚动条，支持鼠标滚轮上下滚动、鼠标拖动滑块移动，内容区域与滚动条实时同步联动，自动计算滚动条高度比例，带边界碰撞检测，超出自动限制位置。",
      Highlights:
        "滚动条高度自适应内容长度、滚轮/拖拽双控制、平滑无卡顿、边界防溢出、定位精准，完全替代原生滚动条。",
      Challenges:
        "精准计算滚动条与内容区的位移比例，滚轮与拖拽事件统一坐标转换，边界限制与防抖动处理。",
    },
  },
  {
    video: `http://localhost:3000/案列23.gif`,
    url: "http://localhost:3000/购物车/购物车.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "水果商城购物车+付款密码页完整系统",
      realize:
        "完整电商前端项目，包含商品列表、数量加减、实时总价计算、余额校验、搜索筛选、无结果提示、跳转到支付页；支付页带6位密码数字键盘、密码设置/修改、支付验证，数据通过localStorage跨页面传递。",
      Highlights:
        "业务逻辑完整、UI精致、余额不足判断、搜索防抖、密码键盘仿微信支付、本地存储持久化、页面间数据流转安全。",
      Challenges:
        "购物车价格实时核算、搜索显示/隐藏匹配、跨页面数据传递、6位密码键盘输入逻辑、余额校验与支付流程控制。",
    },
  },
  {
    video: `http://localhost:3000/案列34.gif`,
    url: "http://localhost:3000/追踪效果/index.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "Canvas 鼠标跟随缓动小球",
      realize:
        "使用 Canvas 绘制红色圆形，通过鼠标移动控制目标点，小球以缓动动画平滑跟随鼠标，采用 requestAnimationFrame 实现流畅渲染，运动效果柔和不生硬。",
      Highlights:
        "纯 Canvas 实现、缓动算法流畅自然、全屏自适应、鼠标追踪响应快、无卡顿、性能轻量。",
      Challenges:
        "使用缓动公式让小球逐渐靠近鼠标，保证运动平滑无瞬移，清屏+重绘循环正确执行。",
    },
  },
  {
    video: `http://localhost:3000/案列28.gif`,
    url: "http://localhost:3000/透明度控制/透明度控制.html",
    difflty: "中等",
    color: "rgb(255, 194, 99)",
    demoexplain: {
      title: "拖动滑块控制图片透明度与进度条",
      realize:
        "实现可拖动黄色滑块，拖动时同步更新蓝色进度条宽度、百分比数值，并按比例控制上方图片的透明度，0%完全透明、100%完全显示，带左右边界限制。",
      Highlights:
        "滑块拖动流畅、进度条实时同步、透明度渐变自然、百分比显示、边界防超出，交互直观完整。",
      Challenges:
        "精准计算鼠标偏移与滑块位置，按比例映射进度条宽度和透明度，正确绑定鼠标事件并做边界限制。",
    },
  },
  {
    video: `http://localhost:3000/案列32.gif`,
    url: "http://localhost:3000/雪花下落/雪花.html",
    difflty: "困难",
    color: "rgb(246, 58, 74)",
    demoexplain: {
      title: "Canvas 模糊雪花下落动画（带阴影柔化效果）",
      realize:
        "使用 Canvas 面向对象创建大量随机雪花，通过 shadowBlur 实现真实模糊柔化效果，雪花大小、速度、模糊度全随机，下落时带左右摇摆，出界自动重置循环飘落，窗口大小自适应。",
      Highlights:
        "视觉真实、模糊层次感强、下落自然流畅、无限循环、性能稳定、全屏自适应，适合做动态背景。",
      Challenges:
        "利用阴影实现雪花模糊、差异化速度模拟物理飘落、边界重置、画布自适应重绘。",
    },
  },
];
console.log(getFile);

getFile.forEach((item, index) => {
  let fpath = path.join(dir, item);
  let stat = fs.statSync(fpath);
  let date = new Date(stat.birthtimeMs).toLocaleDateString();
  dataObj.push({
    id: index,
    video: mapArr[index].video,
    url: mapArr[index].url,
    difflty: mapArr[index].difflty,
    color: mapArr[index].color,
    dateTime: date,
    demoexplain: {
      title: mapArr[index].demoexplain.title,
      realize: mapArr[index].demoexplain.realize,
      Highlights: mapArr[index].demoexplain.Highlights,
      Challenges: mapArr[index].demoexplain.Challenges,
    },
    ...getRate(fpath),
  });
});
fs.writeFileSync(`mapArr.json`, JSON.stringify(dataObj, null, 2), "utf8");
