export type FieldDef =
  | { key: string; label: string; type: "bool"; hint?: string; dependsOn?: string }
  | { key: string; label: string; type: "number"; unit?: string; scale?: number; hint?: string; dependsOn?: string }
  | { key: string; label: string; type: "text" | "password" | "textarea"; hint?: string; dependsOn?: string; mono?: boolean }
  | { key: string; label: string; type: "select"; options: [string | number, string][]; hint?: string; dependsOn?: string };

export interface Section {
  title: string;
  fields: FieldDef[];
}

export interface Tab {
  id: string;
  label: string;
  sections: Section[];
}

const KiB = { unit: "KiB/s", scale: 1024 } as const;

export const settingsTabs: Tab[] = [
  {
    id: "downloads",
    label: "下载",
    sections: [
      {
        title: "添加任务时",
        fields: [
          {
            key: "torrent_content_layout",
            label: "内容布局",
            type: "select",
            options: [
              ["Original", "原始"],
              ["Subfolder", "创建子文件夹"],
              ["NoSubfolder", "不创建子文件夹"],
            ],
          },
          { key: "add_to_top_of_queue", label: "添加到队列顶部", type: "bool" },
          { key: "add_stopped_enabled", label: "添加后不自动开始", type: "bool" },
          {
            key: "torrent_stop_condition",
            label: "停止条件",
            type: "select",
            options: [
              ["None", "无"],
              ["MetadataReceived", "已收到元数据"],
              ["FilesChecked", "文件已校验"],
            ],
          },
          { key: "merge_trackers", label: "合并重复任务的 Tracker", type: "bool" },
        ],
      },
      {
        title: "磁盘",
        fields: [
          { key: "preallocate_all", label: "为所有文件预分配磁盘空间", type: "bool" },
          { key: "incomplete_files_ext", label: "为未完成文件添加 .!qB 扩展名", type: "bool" },
          { key: "use_unwanted_folder", label: "将不需要的文件保存到 .unwanted 文件夹", type: "bool" },
        ],
      },
      {
        title: "保存管理",
        fields: [
          {
            key: "auto_tmm_enabled",
            label: "默认任务管理模式",
            type: "select",
            options: [
              ["false", "手动"],
              ["true", "自动"],
            ],
          },
          { key: "save_path", label: "默认保存路径", type: "text", mono: true },
          { key: "temp_path_enabled", label: "为未完成任务使用单独路径", type: "bool" },
          { key: "temp_path", label: "未完成任务路径", type: "text", mono: true, dependsOn: "temp_path_enabled" },
          { key: "export_dir", label: "复制 .torrent 文件到", type: "text", mono: true },
          { key: "export_dir_fin", label: "复制已完成任务的 .torrent 文件到", type: "text", mono: true },
        ],
      },
      {
        title: "完成后运行外部程序",
        fields: [
          { key: "autorun_on_torrent_added_enabled", label: "添加任务时运行", type: "bool" },
          { key: "autorun_on_torrent_added_program", label: "命令", type: "text", mono: true, dependsOn: "autorun_on_torrent_added_enabled" },
          { key: "autorun_enabled", label: "任务完成时运行", type: "bool" },
          { key: "autorun_program", label: "命令", type: "text", mono: true, dependsOn: "autorun_enabled", hint: "%N 名称，%F 内容路径，%I 哈希 v1" },
        ],
      },
    ],
  },
  {
    id: "connection",
    label: "连接",
    sections: [
      {
        title: "监听端口",
        fields: [
          { key: "listen_port", label: "传入连接端口", type: "number" },
          { key: "upnp", label: "使用 UPnP / NAT-PMP 端口转发", type: "bool" },
          {
            key: "bittorrent_protocol",
            label: "协议",
            type: "select",
            options: [
              [0, "TCP 和 μTP"],
              [1, "TCP"],
              [2, "μTP"],
            ],
          },
        ],
      },
      {
        title: "连接数限制",
        fields: [
          { key: "max_connec", label: "全局最大连接数", type: "number" },
          { key: "max_connec_per_torrent", label: "每个任务最大连接数", type: "number" },
          { key: "max_uploads", label: "全局上传窗口数", type: "number" },
          { key: "max_uploads_per_torrent", label: "每个任务上传窗口数", type: "number" },
        ],
      },
      {
        title: "代理",
        fields: [
          {
            key: "proxy_type",
            label: "类型",
            type: "select",
            options: [
              ["None", "无"],
              ["SOCKS4", "SOCKS4"],
              ["SOCKS5", "SOCKS5"],
              ["HTTP", "HTTP"],
            ],
          },
          { key: "proxy_ip", label: "主机", type: "text", mono: true },
          { key: "proxy_port", label: "端口", type: "number" },
          { key: "proxy_auth_enabled", label: "需要认证", type: "bool" },
          { key: "proxy_username", label: "用户名", type: "text", dependsOn: "proxy_auth_enabled" },
          { key: "proxy_password", label: "密码", type: "password", dependsOn: "proxy_auth_enabled" },
          { key: "proxy_bittorrent", label: "对 BitTorrent 使用代理", type: "bool" },
          { key: "proxy_peer_connections", label: "对用户连接使用代理", type: "bool" },
          { key: "proxy_rss", label: "对 RSS 使用代理", type: "bool" },
          { key: "proxy_misc", label: "对其他用途使用代理", type: "bool" },
        ],
      },
      {
        title: "IP 过滤",
        fields: [
          { key: "ip_filter_enabled", label: "启用 IP 过滤", type: "bool" },
          { key: "ip_filter_path", label: "过滤规则路径", type: "text", mono: true, dependsOn: "ip_filter_enabled" },
          { key: "ip_filter_trackers", label: "应用于 Tracker", type: "bool", dependsOn: "ip_filter_enabled" },
          { key: "banned_IPs", label: "手动封禁的 IP", type: "textarea", mono: true, hint: "每行一个" },
        ],
      },
    ],
  },
  {
    id: "speed",
    label: "速度",
    sections: [
      {
        title: "全局速度限制",
        fields: [
          { key: "dl_limit", label: "下载", type: "number", ...KiB, hint: "0 表示不限制" },
          { key: "up_limit", label: "上传", type: "number", ...KiB },
        ],
      },
      {
        title: "备用速度限制",
        fields: [
          { key: "alt_dl_limit", label: "下载", type: "number", ...KiB },
          { key: "alt_up_limit", label: "上传", type: "number", ...KiB },
          { key: "scheduler_enabled", label: "按计划启用备用速度限制", type: "bool" },
          { key: "schedule_from_hour", label: "开始（时）", type: "number", dependsOn: "scheduler_enabled" },
          { key: "schedule_from_min", label: "开始（分）", type: "number", dependsOn: "scheduler_enabled" },
          { key: "schedule_to_hour", label: "结束（时）", type: "number", dependsOn: "scheduler_enabled" },
          { key: "schedule_to_min", label: "结束（分）", type: "number", dependsOn: "scheduler_enabled" },
          {
            key: "scheduler_days",
            label: "适用日期",
            type: "select",
            dependsOn: "scheduler_enabled",
            options: [
              [0, "每天"],
              [1, "工作日"],
              [2, "周末"],
              [3, "周一"],
              [4, "周二"],
              [5, "周三"],
              [6, "周四"],
              [7, "周五"],
              [8, "周六"],
              [9, "周日"],
            ],
          },
        ],
      },
      {
        title: "限速设置",
        fields: [
          { key: "limit_utp_rate", label: "对 μTP 协议应用速度限制", type: "bool" },
          { key: "limit_tcp_overhead", label: "对传输开销应用速度限制", type: "bool" },
          { key: "limit_lan_peers", label: "对局域网用户应用速度限制", type: "bool" },
        ],
      },
    ],
  },
  {
    id: "bittorrent",
    label: "BitTorrent",
    sections: [
      {
        title: "隐私",
        fields: [
          { key: "dht", label: "启用 DHT", type: "bool" },
          { key: "pex", label: "启用用户交换（PeX）", type: "bool" },
          { key: "lsd", label: "启用本地用户发现", type: "bool" },
          {
            key: "encryption",
            label: "加密模式",
            type: "select",
            options: [
              [0, "允许加密"],
              [1, "强制加密"],
              [2, "禁用加密"],
            ],
          },
          { key: "anonymous_mode", label: "匿名模式", type: "bool" },
        ],
      },
      {
        title: "队列",
        fields: [
          { key: "queueing_enabled", label: "启用任务队列", type: "bool" },
          { key: "max_active_downloads", label: "最大活动下载数", type: "number", dependsOn: "queueing_enabled" },
          { key: "max_active_uploads", label: "最大活动上传数", type: "number", dependsOn: "queueing_enabled" },
          { key: "max_active_torrents", label: "最大活动任务数", type: "number", dependsOn: "queueing_enabled" },
          { key: "dont_count_slow_torrents", label: "慢速任务不计入限制", type: "bool", dependsOn: "queueing_enabled" },
        ],
      },
      {
        title: "做种限制",
        fields: [
          { key: "max_ratio_enabled", label: "分享率达到时", type: "bool" },
          { key: "max_ratio", label: "分享率", type: "number", dependsOn: "max_ratio_enabled" },
          { key: "max_seeding_time_enabled", label: "做种时间达到时", type: "bool" },
          { key: "max_seeding_time", label: "做种时间", type: "number", unit: "分钟", dependsOn: "max_seeding_time_enabled" },
          {
            key: "max_ratio_act",
            label: "执行动作",
            type: "select",
            options: [
              [0, "停止任务"],
              [1, "删除任务"],
              [3, "删除任务及文件"],
              [2, "启用超级做种"],
            ],
          },
        ],
      },
      {
        title: "自动添加 Tracker",
        fields: [
          { key: "add_trackers_enabled", label: "自动向新任务添加以下 Tracker", type: "bool" },
          { key: "add_trackers", label: "Tracker 列表", type: "textarea", mono: true, dependsOn: "add_trackers_enabled" },
        ],
      },
    ],
  },
  {
    id: "rss",
    label: "RSS",
    sections: [
      {
        title: "RSS 阅读器",
        fields: [
          { key: "rss_processing_enabled", label: "启用 RSS 订阅获取", type: "bool" },
          { key: "rss_refresh_interval", label: "刷新间隔", type: "number", unit: "分钟" },
          { key: "rss_max_articles_per_feed", label: "每个订阅源的最大文章数", type: "number" },
        ],
      },
      {
        title: "自动下载",
        fields: [
          { key: "rss_auto_downloading_enabled", label: "启用 RSS 自动下载", type: "bool" },
          { key: "rss_download_repack_proper_episodes", label: "下载 REPACK / PROPER 剧集", type: "bool" },
          { key: "rss_smart_episode_filters", label: "智能剧集过滤器", type: "textarea", mono: true },
        ],
      },
    ],
  },
  {
    id: "webui",
    label: "WebUI",
    sections: [
      {
        title: "Web 用户界面",
        fields: [
          { key: "locale", label: "语言", type: "text" },
          { key: "web_ui_port", label: "端口", type: "number" },
          { key: "web_ui_upnp", label: "使用 UPnP 转发 WebUI 端口", type: "bool" },
        ],
      },
      {
        title: "认证",
        fields: [
          { key: "web_ui_username", label: "用户名", type: "text" },
          { key: "web_ui_password", label: "新密码", type: "password", hint: "留空保持不变" },
          { key: "bypass_local_auth", label: "对本机客户端跳过认证", type: "bool" },
          { key: "bypass_auth_subnet_whitelist_enabled", label: "对白名单子网跳过认证", type: "bool" },
          { key: "bypass_auth_subnet_whitelist", label: "子网白名单", type: "textarea", mono: true, dependsOn: "bypass_auth_subnet_whitelist_enabled" },
          { key: "web_ui_max_auth_fail_count", label: "连续失败次数上限", type: "number" },
          { key: "web_ui_ban_duration", label: "封禁时长", type: "number", unit: "秒" },
          { key: "web_ui_session_timeout", label: "会话超时", type: "number", unit: "秒" },
        ],
      },
      {
        title: "替代 WebUI",
        fields: [
          { key: "alternative_webui_enabled", label: "使用替代 WebUI", type: "bool", hint: "关闭后刷新页面即恢复官方界面" },
          { key: "alternative_webui_path", label: "文件位置", type: "text", mono: true, dependsOn: "alternative_webui_enabled" },
        ],
      },
      {
        title: "安全",
        fields: [
          { key: "web_ui_clickjacking_protection_enabled", label: "启用点击劫持保护", type: "bool" },
          { key: "web_ui_csrf_protection_enabled", label: "启用 CSRF 保护", type: "bool" },
          { key: "web_ui_host_header_validation_enabled", label: "启用 Host 头验证", type: "bool" },
          { key: "web_ui_domain_list", label: "服务器域名", type: "text", mono: true },
        ],
      },
    ],
  },
  {
    id: "advanced",
    label: "高级",
    sections: [
      {
        title: "qBittorrent",
        fields: [
          { key: "refresh_interval", label: "界面刷新间隔", type: "number", unit: "毫秒" },
          { key: "resolve_peer_countries", label: "解析用户所在国家", type: "bool" },
          { key: "reannounce_when_address_changed", label: "IP 或端口变化时重新汇报", type: "bool" },
          { key: "recheck_completed_torrents", label: "完成后重新校验", type: "bool" },
          { key: "file_log_enabled", label: "写入日志文件", type: "bool" },
          { key: "file_log_path", label: "日志路径", type: "text", mono: true, dependsOn: "file_log_enabled" },
        ],
      },
      {
        title: "libtorrent",
        fields: [
          { key: "async_io_threads", label: "异步 I/O 线程数", type: "number" },
          { key: "hashing_threads", label: "哈希线程数", type: "number" },
          { key: "file_pool_size", label: "文件池大小", type: "number" },
          { key: "checking_memory_use", label: "校验内存用量", type: "number", unit: "MiB" },
          { key: "disk_cache", label: "磁盘缓存", type: "number", unit: "MiB", hint: "-1 为自动" },
          { key: "send_buffer_watermark", label: "发送缓冲水位", type: "number", unit: "KiB" },
          { key: "enable_embedded_tracker", label: "启用内置 Tracker", type: "bool" },
          { key: "embedded_tracker_port", label: "内置 Tracker 端口", type: "number", dependsOn: "enable_embedded_tracker" },
          { key: "announce_to_all_trackers", label: "总是向同层级的所有 Tracker 汇报", type: "bool" },
          { key: "announce_to_all_tiers", label: "总是向所有层级的 Tracker 汇报", type: "bool" },
          { key: "announce_ip", label: "汇报 IP 地址", type: "text", mono: true },
        ],
      },
    ],
  },
];
