const {createApp, tasks} = require('../app/index');

function createServer(civitai = {}) {
  const app = createApp({
    civitai: {
      modelDownload: jest.fn().mockResolvedValue(true),
      modelDownloadAll: jest.fn().mockResolvedValue(undefined),
      getModels: jest.fn().mockResolvedValue({items: []}),
      ...civitai
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({
        server,
        civitai: app.locals?.civitai,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe('POST /api/download', () => {
  beforeEach(() => {
    Object.keys(tasks).forEach((key) => {
      delete tasks[key];
    });
  });

  test('starts a single download task', async () => {
    const civitai = {
      modelDownload: jest.fn().mockResolvedValue(true)
    };
    const {server, baseUrl} = await createServer(civitai);

    const response = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key'
      },
      body: JSON.stringify({
        url: 'https://example.com/model/1',
        title: 'Title',
        resume: true,
        force: false,
        categories: ['tag-a'],
        member: 'alice'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.taskId).toBe('string');
    expect(civitai.modelDownload).toHaveBeenCalledWith(
      'https://example.com/model/1',
      expect.objectContaining({
        apiKey: 'test-api-key',
        member: 'alice'
      })
    );

    await closeServer(server);
  });

  test('starts a multi download task for array payloads', async () => {
    const civitai = {
      modelDownloadAll: jest.fn().mockResolvedValue(undefined)
    };
    const {server, baseUrl} = await createServer(civitai);
    const payload = [
      {
        url: 'https://example.com/model/1',
        title: 'Title1',
        resume: true,
        force: false,
        categories: ['tag-a'],
        member: 'alice'
      },
      {
        url: 'https://example.com/model/2',
        title: 'Title2',
        resume: false,
        force: true,
        categories: ['tag-b'],
        member: 'bob'
      }
    ];

    const response = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer batch-key'
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.taskId).toBe('string');
    expect(civitai.modelDownloadAll).toHaveBeenCalledWith(
      ['https://example.com/model/1', 'https://example.com/model/2'],
      expect.arrayContaining([
        expect.objectContaining({apiKey: 'batch-key'}),
        expect.objectContaining({apiKey: 'batch-key'})
      ])
    );

    await closeServer(server);
  });

  test('rejects requests with missing keys', async () => {
    const {server, baseUrl} = await createServer();

    const response = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://example.com/model/1',
        title: 'Title'
      })
    });
    const body = await response.json();

    expect(body.status).toBe('error');
    expect(body.error).toBe('missing keys');
    expect(body.badKeys).toEqual(expect.arrayContaining(['resume', 'force', 'categories', 'member']));

    await closeServer(server);
  });
});
