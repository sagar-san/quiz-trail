export async function withDeadline<T>(operation: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('This request is taking too long. Your draft is kept. It may have saved; retrying the same comment will not create a duplicate.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

