# 数据来源

- 中国省市边界：阿里云 DataV.GeoAtlas，https://datav.aliyun.com/portal/school/atlas/area_selector 。公开边界快照不包含所有最新设立城市。
- 台湾市县边界：twgeojson（CC0），https://github.com/ronnywang/twgeojson 。桃园市名称已更新。
- 新星市：边界快照缺失，因此采用城市点位，而非绘制推测边界。点位参考 https://www.wikidata.org/wiki/Q105300298 。
- 大陆普通高校：教育部截至2026年6月17日的2952所名单。公告 https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/t20260618_1441074.html ，文件镜像 https://github.com/dataxiv/data-universities/tree/main/普通高等学校 。
- 港澳台及军事高校：公开整理名录 https://github.com/dataxiv/data-universities/tree/main/data 。
- 繁体校名转简体：OpenCC 字符字典，https://github.com/BYVoid/OpenCC 。

共3198所学校，均已匹配城市。学校默认地点采用名录所在地；异地校区需选择实际所在城市。同一学校在不同城市可分别记录；同一学校与城市组合不重复。

大学库为建站时保存的快照，并非实时查询。港澳台与军事高校整理名单可能存在更新滞后。
