import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment, faTimes, faStar } from '@fortawesome/free-solid-svg-icons'
import styles from '../styles/FeedbackWidget.module.css'

interface FeedbackWidgetProps {
  onSubmit: (feedback: FeedbackData) => void
}

interface FeedbackData {
  rating: number
  message: string
  category: string
  userEmail?: string
}

const FeedbackWidget = ({ onSubmit }: FeedbackWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    { value: 'general', label: 'Geral' },
    { value: 'usability', label: 'Usabilidade' },
    { value: 'accuracy', label: 'Precisão das Métricas' },
    { value: 'recommendations', label: 'Recomendações' },
    { value: 'performance', label: 'Performance' },
    { value: 'bug', label: 'Bug/Erro' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0 || message.trim() === '') {
      alert('Por favor, preencha a avaliação e o comentário.')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        rating,
        message: message.trim(),
        category,
      })
      
      // Reset form
      setRating(0)
      setMessage('')
      setCategory('general')
      setIsOpen(false)
      
      alert('Obrigado pelo seu feedback!')
    } catch (error) {
      alert('Erro ao enviar feedback. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = () => (
    <div className={styles.starRating}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className={`${styles.star} ${star <= rating ? styles.starFilled : ''}`}
        >
          <FontAwesomeIcon icon={faStar} />
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* Floating button */}
      <button
        className={styles.floatingButton}
        onClick={() => setIsOpen(true)}
        title="Enviar Feedback"
      >
        <FontAwesomeIcon icon={faComment} />
      </button>

      {/* Feedback modal */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Seu Feedback é Importante!</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.feedbackForm}>
              <div className={styles.formGroup}>
                <label>Como você avalia sua experiência?</label>
                <StarRating />
                {rating > 0 && (
                  <span className={styles.ratingText}>
                    {rating === 1 && "Muito ruim"}
                    {rating === 2 && "Ruim"}
                    {rating === 3 && "Regular"}
                    {rating === 4 && "Bom"}
                    {rating === 5 && "Excelente"}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="category">Categoria do feedback:</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.select}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message">Conte-nos mais sobre sua experiência:</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva sua experiência, sugestões ou problemas encontrados..."
                  className={styles.textarea}
                  rows={4}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={styles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || message.trim() === ''}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackWidget
