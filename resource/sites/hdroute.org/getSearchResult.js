(function(options) {
  class Parser {
    constructor() {
      this.haveData = false;
      if (/loginSection/.test(options.responseText)) {
        options.status = ESearchResultParseStatus.needLogin; //`[${options.site.name}]需要登录后再搜索`;
        return;
      }

      options.isLogged = true;

      if (/对不起，没有您搜索的相关结果/.test(options.responseText)) {
        options.status = ESearchResultParseStatus.noTorrents; //`[${options.site.name}]没有搜索到相关的种子`;
        return;
      }

      this.haveData = true;
    }

    /**
     * 获取搜索结果
     */
    getResult() {
      if (!this.haveData) {
        return [];
      }
      let site = options.site;
      let selector = options.resultSelector;
      let rows = options.page.find(selector);
      let results = [];

      if (site.url.lastIndexOf("/") != site.url.length - 1) {
        site.url += "/";
      }

      try {
        // 遍历数据行
        for (let index = 0; index < rows.length; index++) {
          const row = rows.eq(index);
          let id = row.attr("id").replace("dl_torrent_", "");
          let url = `${site.url}download.php?id=${id}`;
          let link = `${site.url}details.php?id=${id}`;

          let data = {
            title: row.find(".title_chs").text(),
            subTitle: row.find(".title_eng").text(),
            link,
            url,
            size: row.find(".torrent_size").text(),
            time: this.getTime(row.find(".torrent_added")),
            author: "",
            seeders: this.getTorrentCount(
              row
                .find(".torrent_count.strong")
                .eq(0)
                .text()
            ),
            leechers: this.getTorrentCount(
              row
                .find(".torrent_count.strong")
                .eq(1)
                .text()
            ),
            completed: -1,
            comments: 0,
            site: site,
            tags: this.getTags(row, options.torrentTagSelectors),
            entryName: options.entry.name,
            category: null
          };
          results.push(data);
        }

        if (results.length == 0) {
          options.status = ESearchResultParseStatus.noTorrents; //`[${options.site.name}]没有搜索到相关的种子`;
        }
      } catch (error) {
        console.log(error);
        options.status = ESearchResultParseStatus.parseError;
        options.errorMsg = error.stack; //`[${options.site.name}]获取种子信息出错: ${error.stack}`;
      }

      return results;
    }

    getTorrentCount(text) {
      return text == "---" ? 0 : text;
    }

    /**
     * 获取时间
     * @param {*} el
     */
    getTime(el) {
      let time = $("<span>")
        .html(el.html().replace("<br>", " "))
        .text();
      return time || "";
    }

    /**
     * 获取标签
     * @param {*} row
     * @param {*} selectors
     * @return array
     */
    getTags(row, selectors) {
      let tags = [];
      if (selectors && selectors.length > 0) {
        selectors.forEach(item => {
          if (item.selector) {
            let result = row.find(item.selector);
            if (result.length) {
              let data = {
                name: item.name,
                color: item.color
              };
              if (item.title && result.attr(item.title)) {
                data.title = result.attr(item.title);
              }
              tags.push(data);
            }
          }
        });
      }
      return tags;
    }
  }

  let parser = new Parser(options);
  options.results = parser.getResult();
  console.log(options.results);
})(options);