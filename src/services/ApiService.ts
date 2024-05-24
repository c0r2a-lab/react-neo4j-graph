import { AxiosResponse } from "axios";

import AxiosInstance from "./AxiosInstance";
import { ApiUrl } from "./ApiConfig";

export class ApiService {
  public static fetchGraphs(params?: any): Promise<AxiosResponse> {
    return AxiosInstance.get(ApiUrl.graphs, params);
  }

  public static postGraph(params: any): Promise<AxiosResponse> {
    return AxiosInstance.post(ApiUrl.graphs, params);
  }

  public static patchGraph(id: number | string, params: any): Promise<AxiosResponse> {
    return AxiosInstance.patch(`${ApiUrl.graphs}/${id}`, params);
  }

  public static deleteGraph(id: number | string): Promise<AxiosResponse> {
    return AxiosInstance.delete(`${ApiUrl.graphs}/${id}`);
  }

  // public static fetchLinks(params?: any): Promise<AxiosResponse> {
  //   return AxiosInstance.get(ApiUrl.links, params);
  // }

  // public static postLink(params: any): Promise<AxiosResponse> {
  //   return AxiosInstance.post(ApiUrl.links, params);
  // }

  // public static patchLink(id: number | string, params: any): Promise<AxiosResponse> {
  //   return AxiosInstance.patch(`${ApiUrl.links}/${id}`, params);
  // }

  // public static deleteLink(id: number | string): Promise<AxiosResponse> {
  //   return AxiosInstance.delete(`${ApiUrl.links}/${id}`);
  // }
}
