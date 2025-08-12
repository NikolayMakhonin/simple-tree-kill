/**
 * Simple promise-based delay utility
 * @param timeMilliseconds - Delay duration in milliseconds
 */
export function delay(timeMilliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeMilliseconds)
  })
}
