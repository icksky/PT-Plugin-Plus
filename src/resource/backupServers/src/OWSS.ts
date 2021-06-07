import { IBackupConfig, IBackupFileInfo, IBackupMetadata, IBackupServer } from '@/resource/backupServers/type';
import urljoin from 'url-join';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface OWSSConfig extends IBackupConfig {
  config: {
    authCode: string;
  }
}

interface OWSSResponse<T = any> {
  // 如果请求正常，则返回内容都在data中
  data?: T

  /**
   * 发生错误时，可能有以下的各种返回形式，所以统一通过 !!data.data 判断是否请求成功
   * - {'error': {'code': 10004, 'msg': 'Invalid request id'}}
   * - {'code': 10003, 'msg': 'Invalid request'}
   * - {'code': 'MethodNotAllowed', 'message': 'POST is not allowed'}
   */
  error?: {code?: number, msg?: string},
  code?: number,
  msg?: string,
  message?: string
}

/**
 * @link: https://github.com/ronggang/OWSS/blob/ce313a33f83ada521a5858cceef4a841c9531b4a/src/class/storage.ts#L133-L139
 */
interface OWSSRawList {
  name: string,
  time: number,
  type: 'directory' | 'file',
  size: number
}

export const serverConfig: OWSSConfig = {
  id: 'a20d0642-2115-471d-a72c-cdb8daa35401',
  name: 'OWSS',
  type: 'OWSS',
  address: 'http://127.0.0.1:8088/storage',
  config: { authCode: '' }
};

export const serverMetaData: IBackupMetadata = {

};

/**
 * OWSS 客户端实现
 * @see: https://github.com/ronggang/OWSS
 */
export default class OWSS implements IBackupServer<OWSSConfig> {
  readonly config: OWSSConfig;
  private readonly address: string;

  constructor (config: OWSSConfig) {
    this.config = config;

    // 生成实际使用的访问链接
    let { address } = this.config;
    if (address.indexOf('storage') === -1) {
      address = urljoin(address, 'storage');
    }
    address = urljoin(address, this.config.config.authCode);
    this.address = address;
  }

  private async request <T> (config: AxiosRequestConfig) : Promise<AxiosResponse<T>> {
    return await axios.request<T>({
      baseURL: this.address,
      timeout: 45e3,
      ...config
    });
  }

  public async ping (): Promise<boolean> {
    try {
      const { data } = await this.request<OWSSResponse<OWSSRawList[]>>({ url: '/list' });
      return Array.isArray(data.data);
    } catch (e) {
      return false;
    }
  }

  // TODO 筛选设置
  public async list (options: any): Promise<IBackupFileInfo[]> {
    const { data: listData } = await this.request<OWSSResponse<OWSSRawList[]>>({ url: '/list' });

    const backupFiles : IBackupFileInfo[] = [];

    if (listData.data) {
      listData.data.forEach(value => {
        const { name: filename, time, size } = value;
        backupFiles.push({ filename, time, size } as IBackupFileInfo);
      });
    }

    return backupFiles;
  }

  public async addFile (fileName: string, file: Blob): Promise<boolean> {
    const formData = new FormData();
    formData.append('name', fileName);
    formData.append('data', file, fileName);

    const { data } = await this.request<OWSSResponse<boolean>>({ method: 'post', url: '/add', data: formData });
    return !!data.data;
  }

  public async deleteFile (path: string): Promise<boolean> {
    const { data } = await this.request<OWSSResponse<boolean>>({ method: 'post', url: urljoin('/delete', path) });
    return !!data.data;
  }

  public async getFile (path: string): Promise<Blob> {
    const { data } = await this.request<Blob>({ url: urljoin('/get', path), responseType: 'blob' });
    return data;
  }
}
