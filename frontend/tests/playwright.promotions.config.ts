import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'.',testMatch:'promotions.spec.ts',tsconfig:'../tsconfig.json',timeout:120000,workers:1,use:{channel:'msedge',baseURL:'http://127.0.0.1:8094',viewport:{width:1440,height:1050},navigationTimeout:90000,contextOptions:{reducedMotion:'reduce'}},outputDir:'../.expo/promotion-tests' });
