import axios, {AxiosInstance} from "axios";
import {Global} from "../../global";

let axiosInstance: AxiosInstance;
// $http.interceptors.response.use((response) => {
//     return Promise.resolve(response.data);
//   }, (error) => {
//     return Promise.reject(error.response);
//   });

export const http = () => {
    if (!axiosInstance) {
        axiosInstance = axios.create({
            baseURL: "",
            // headers: { 'X-Requested-With': 'XMLHttpRequest' },
            // withCredentials: true,
            responseType: "json", // default
            timeout: 30000,
            headers: {
                'server_id':  Global.conf.server_id,
                'server_hash':  Global.conf.server_hash,
                'Content-Type': 'application/json',
            },
        });

        axiosInstance.interceptors.request.use((config) => {
            // console.log('$http', config)
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
    }
    return axiosInstance;
};
