import styles from '../styles/RequestListItem.module.css'
import Divider from './Divider';

interface RequestListItemProps {
  name: string
  email: string
  url: string
  status: string
  action?: React.ReactNode
}

// Status text removed per new UX: we'll render an action button instead

const RequestListItem = (props: RequestListItemProps) => {
  return (
    <>
      <div className={styles.requestListItem}>
        <div className={styles.info}>
          {/* <div className={styles.nameAndEmail}>
            <span className={styles.name}>{props.name}</span>
            <span>•</span>
            <span className={styles.email}>{props.email}</span>
          </div> */}
          <span className={styles.url}>{props.url.split('/')[props.url.split('/').length - 1]}</span>
        </div>
        <div className={styles.status}>
          {props.action || null}
        </div>
      </div>
      {/* <Divider /> */}
    </>
  );
}

export default RequestListItem;